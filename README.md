# Smart Glossary Architecture Design

## 1. 전체 시스템 아키텍처

### 1.1 시스템 개요
Smart Glossary는 웹페이지에서 전문 용어를 자동 감지하고 AI 기반으로 판별하여 설명을 제공하는 Chrome Extension입니다. 사전 기반이 아닌 패턴 기반 후보 추출과 AI 판별을 사용합니다.

### 1.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chrome Extension                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │   Popup UI   │◄────►│  Options UI  │◄────►│  Content     │   │
│  │   (React)    │      │   (React)    │      │  Script      │   │
│  └──────────────┘      └──────────────┘      │  (Vanilla TS) │   │
│         │                     │              └──────┬───────┘   │
│         └─────────────────────┴─────────────────────┼───────────┤
│                                                        │          │
│  ┌────────────────────────────────────────────────────▼──────────┐│
│  │              Background Service Worker (Manifest V3)          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       ││
│  │  │ Cache Manager│  │ API Client   │  │ Message Hub  │       ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘       ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server (Node.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   API Routes │  │ AI Service   │  │ Cache Layer  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │   OpenAI     │  │   Gemini     │                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 핵심 컴포넌트

**Client Side (Chrome Extension)**
- Popup UI: 사용자 인터페이스, 설정 관리
- Options UI: 확장프로그램 설정 페이지
- Content Script: 웹페이지 DOM 분석, 용어 하이라이트
- Background Service Worker: 메시지 라우팅, 캐시 관리, API 통신

**Server Side (Backend)**
- API Server: REST API 엔드포인트
- AI Service: OpenAI/Gemini 통합
- Cache Layer: Redis/In-memory 캐시

---

## 2. 데이터 흐름도

### 2.1 용어 감지 및 설명 제공 흐름

```
사용자 웹페이지 방문
        │
        ▼
┌─────────────────────────────────┐
│ Content Script 로드              │
│ - DOM 트리 분석                  │
│ - 텍스트 노드 추출               │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 패턴 기반 용어 후보 추출         │
│ - 대문자 단어 패턴               │
│ - 기술 용어 패턴                 │
│ - 숫자+문자 조합 패턴            │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 캐시 확인 (IndexedDB)            │
│ - 용어별 캐시 키 조회            │
│ - TTL 체크                       │
└─────────────────────────────────┘
        │
        ├─ 캐시 히트 ──────────────┐
        │                          ▼
        │              ┌───────────────────────┐
        │              │ 캐시된 결과 사용       │
        │              │ - 설명 텍스트          │
        │              │ - 카테고리             │
        │              └───────────────────────┘
        │                          │
        │                          ▼
        │              ┌───────────────────────┐
        │              │ DOM 하이라이트 적용    │
        │              └───────────────────────┘
        │
        └─ 캐시 미스 ──────────────┐
                                   ▼
                    ┌──────────────────────────┐
                    │ Background Worker로 전송  │
                    │ - 후보 용어 목록          │
                    │ - 페이지 컨텍스트         │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ Backend API 호출         │
                    │ POST /api/terms/analyze  │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ AI Service 판별          │
                    │ - OpenAI/Gemini 선택     │
                    │ - 용어 관련성 판단       │
                    │ - 설명 생성               │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ 결과 반환                │
                    │ - 관련 용어만 필터링      │
                    │ - 설명 텍스트 포함        │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ IndexedDB에 캐싱         │
                    │ - 용어별 저장             │
                    │ - TTL 설정                │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ Content Script로 전송     │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ DOM 하이라이트 적용       │
                    └──────────────────────────┘
```

### 2.2 사용자 설정 흐름

```
Popup UI/Options UI
        │
        ▼
┌─────────────────────────────────┐
│ 사용자 설정 변경                 │
│ - AI 모델 선택                   │
│ - 하이라이트 스타일              │
│ - 자동 감지 ON/OFF               │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Chrome Storage에 저장            │
│ - chrome.storage.sync            │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Content Script에 브로드캐스트   │
│ - 설정 변경 알림                 │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 실시간 적용                      │
└─────────────────────────────────┘
```

---

## 3. 폴더 구조

```
Smart-Glossary/
├── extension/                      # Chrome Extension
│   ├── manifest.json              # Manifest V3 설정
│   ├── public/                    # 정적 리소스
│   │   ├── icons/                 # 확장프로그램 아이콘
│   │   └── popup.html             # Popup HTML
│   ├── src/
│   │   ├── popup/                 # Popup UI (React)
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   ├── TermList.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSettings.ts
│   │   │   └── styles/
│   │   │       └── popup.css
│   │   ├── options/               # Options UI (React)
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── GeneralSettings.tsx
│   │   │   │   ├── AIModelSettings.tsx
│   │   │   │   └── AppearanceSettings.tsx
│   │   │   └── styles/
│   │   │       └── options.css
│   │   ├── content/               # Content Script (Vanilla TS)
│   │   │   ├── index.ts           # 진입점
│   │   │   ├── dom-analyzer.ts    # DOM 분석기
│   │   │   ├── term-extractor.ts  # 용어 후보 추출
│   │   │   ├── highlighter.ts     # 하이라이트 적용
│   │   │   ├── tooltip-manager.ts # 툴팁 관리
│   │   │   └── message-handler.ts # 메시지 핸들러
│   │   ├── background/            # Background Service Worker
│   │   │   ├── index.ts           # 진입점
│   │   │   ├── cache-manager.ts   # 캐시 관리
│   │   │   ├── api-client.ts      # Backend API 클라이언트
│   │   │   ├── message-hub.ts    # 메시지 라우팅
│   │   │   └── storage-manager.ts # Chrome Storage 관리
│   │   ├── shared/                # 공유 코드
│   │   │   ├── types/             # TypeScript 타입 정의
│   │   │   │   ├── index.ts
│   │   │   │   ├── term.ts
│   │   │   │   ├── cache.ts
│   │   │   │   └── settings.ts
│   │   │   ├── constants/         # 상수 정의
│   │   │   │   └── index.ts
│   │   │   ├── utils/             # 유틸리티 함수
│   │   │   │   ├── logger.ts
│   │   │   │   └── validator.ts
│   │   │   └── config/            # 설정
│   │   │       └── index.ts
│   │   └── db/                    # IndexedDB 관리
│   │       ├── index.ts
│   │       ├── schema.ts
│   │       └── repositories/
│   │           ├── term-repository.ts
│   │           └── cache-repository.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             # Vite 설정
│   └── build/                     # 빌드 결과
│
├── server/                         # Backend Server
│   ├── src/
│   │   ├── index.ts               # 서버 진입점
│   │   ├── routes/                # API 라우트
│   │   │   ├── index.ts
│   │   │   ├── terms.ts           # 용어 분석 API
│   │   │   └── health.ts          # 헬스체크
│   │   ├── services/              # 비즈니스 로직
│   │   │   ├── ai-service.ts      # AI 서비스
│   │   │   │   ├── openai.ts
│   │   │   │   └── gemini.ts
│   │   │   ├── cache-service.ts   # 캐시 서비스
│   │   │   └── rate-limiter.ts   # 속도 제한
│   │   ├── controllers/           # 컨트롤러
│   │   │   ├── term-controller.ts
│   │   │   └── health-controller.ts
│   │   ├── middleware/            # 미들웨어
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── logger.ts
│   │   ├── types/                 # TypeScript 타입
│   │   │   ├── index.ts
│   │   │   └── api.ts
│   │   ├── config/                # 설정
│   │   │   ├── index.ts
│   │   │   └── env.ts
│   │   └── utils/                 # 유틸리티
│   │       ├── logger.ts
│   │       └── validator.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docs/                          # 문서
│   ├── architecture.md           # 아키텍처 문서
│   ├── api.md                     # API 문서
│   └── development.md            # 개발 가이드
│
├── scripts/                       # 스크립트
│   ├── build-extension.sh
│   ├── build-server.sh
│   └── dev.sh
│
├── .gitignore
├── README.md
└── package.json                   # 루트 패키지 (monorepo)
```

---

## 4. 각 모듈의 책임

### 4.1 Extension Modules

**Popup UI (`src/popup/`)**
- 사용자 설정 인터페이스 제공
- 현재 페이지 감지된 용어 목록 표시
- AI 모델 선택 및 설정
- 확장프로그램 상태 표시

**Options UI (`src/options/`)**
- 확장프로그램 전체 설정 관리
- API 키 설정
- 하이라이트 스타일 커스터마이징
- 캐시 설정 관리

**Content Script (`src/content/`)**
- DOM 트리 분석 및 텍스트 추출
- 패턴 기반 용어 후보 추출
- 하이라이트 적용 및 툴팁 표시
- Background Worker와 메시지 통신

**Background Service Worker (`src/background/`)**
- Content Script과 Backend 간 통신 중계
- IndexedDB 캐시 관리
- Chrome Storage 동기화
- 메시지 라우팅 및 이벤트 처리

**Shared (`src/shared/`)**
- 공통 TypeScript 타입 정의
- 상수 및 설정값
- 유틸리티 함수

**Database (`src/db/`)**
- IndexedDB 스키마 정의
- Repository 패턴 구현
- 데이터 접근 계층

### 4.2 Server Modules

**API Routes (`src/routes/`)**
- REST API 엔드포인트 정의
- 요청 유효성 검사
- 컨트롤러 라우팅

**Services (`src/services/`)**
- AI 서비스: OpenAI/Gemini API 통합
- 캐시 서비스: Redis/In-memory 캐시
- 속도 제한: API 호출 제어

**Controllers (`src/controllers/`)**
- 요청 처리 로직
- 서비스 계층 호출
- 응답 포맷팅

**Middleware (`src/middleware/`)**
- 인증 및 권한 확인
- 에러 처리
- 로깅

---

## 5. TypeScript 타입 구조

### 5.1 공유 타입 (`extension/src/shared/types/`)

```typescript
// term.ts
export interface TermCandidate {
  text: string;
  position: {
    start: number;
    end: number;
  };
  context: string;
  xpath: string;
}

export interface TermAnalysis {
  term: string;
  isRelevant: boolean;
  explanation: string | null;
  category: string | null;
  confidence: number;
  timestamp: number;
}

export interface HighlightedTerm {
  term: string;
  explanation: string;
  category: string;
  element: HTMLElement;
}

// cache.ts
export interface CacheEntry {
  term: string;
  analysis: TermAnalysis;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

// settings.ts
export interface UserSettings {
  aiModel: 'openai' | 'gemini';
  autoDetect: boolean;
  highlightStyle: {
    backgroundColor: string;
    textColor: string;
    underline: boolean;
  };
  cacheEnabled: boolean;
  cacheTTL: number;
  maxTermsPerPage: number;
}

export interface APIKeyConfig {
  openaiKey: string;
  geminiKey: string;
}

// message.ts
export interface Message {
  type: string;
  payload: unknown;
  timestamp: number;
}

export type MessageType =
  | 'ANALYZE_TERMS'
  | 'TERMS_ANALYZED'
  | 'GET_SETTINGS'
  | 'SETTINGS_UPDATED'
  | 'CACHE_CLEAR'
  | 'ERROR';
```

### 5.2 서버 타입 (`server/src/types/`)

```typescript
// api.ts
export interface AnalyzeTermsRequest {
  candidates: TermCandidate[];
  context: string;
  url: string;
  model?: 'openai' | 'gemini';
}

export interface AnalyzeTermsResponse {
  analyses: TermAnalysis[];
  modelUsed: string;
  processingTime: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    openai: boolean;
    gemini: boolean;
    cache: boolean;
  };
  timestamp: number;
}
```

---

## 6. Content Script 설계

### 6.1 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Content Script                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │ DOM Analyzer │─────►│Term Extractor│                │
│  └──────────────┘      └──────┬───────┘                │
│         │                      │                        │
│         │                      ▼                        │
│         │              ┌──────────────┐                │
│         │              │Cache Checker │                │
│         │              └──────┬───────┘                │
│         │                     │                        │
│         │         ┌───────────┴───────────┐            │
│         │         │                       │            │
│         │    Hit  │                  Miss  │            │
│         │         ▼                       ▼            │
│         │  ┌──────────────┐      ┌──────────────┐      │
│         │  │ Highlighter  │      │Message      │      │
│         │  │              │      │Handler      │      │
│         │  └──────────────┘      └──────┬───────┘      │
│         │                               │              │
│         │                               ▼              │
│         │                      ┌──────────────┐        │
│         │                      │Background    │        │
│         │                      │Worker        │        │
│         │                      └──────────────┘        │
│         │                               │              │
│         │                               ▼              │
│         │                      ┌──────────────┐        │
│         └──────────────────────│Highlighter  │        │
│                                │              │        │
│                                └──────────────┘        │
│                                                           │
│  ┌──────────────┐                                       │
│  │Tooltip       │                                       │
│  │Manager       │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 핵심 컴포넌트

**DOM Analyzer (`dom-analyzer.ts`)**
- 페이지 로드 감지
- DOM 트리 순회
- 텍스트 노드 추출
- 변경 감지 (MutationObserver)

**Term Extractor (`term-extractor.ts`)**
- 패턴 기반 용어 추출
- 정규식 패턴:
  - 대문자로 시작하는 단어 (2글자 이상)
  - 카멜케이스 패턴
  - 기술 용어 패턴 (예: API, HTTP, JSON)
  - 숫자+문자 조합 (예: Web3, 5G)
- 후보 용어 필터링
- 컨텍스트 추출

**Cache Checker (내장)**
- IndexedDB 캐시 조회
- TTL 유효성 확인
- 캐시 히트/미스 분기

**Highlighter (`highlighter.ts`)**
- DOM 조작 최소화
- `<mark>` 태그 또는 `<span>` 사용
- CSS 클래스 적용
- 원본 텍스트 보존

**Tooltip Manager (`tooltip-manager.ts`)**
- 하이라이트된 용어 호버 감지
- 툴팁 표시/숨기기
- 위치 계산
- 애니메이션 처리

**Message Handler (`message-handler.ts`)**
- Background Worker와 통신
- 메시지 타입 라우팅
- 에러 처리
- 재시도 로직

### 6.3 성능 최적화 전략

- **Debouncing**: DOM 변경 감지 시 디바운싱 적용
- **Batch Processing**: 용어 후보를 일괄 처리
- **Lazy Loading**: 스크롤 시 보이는 영역만 처리
- **Web Worker**: 무거운 연산은 Web Worker로 이동 (선택적)

---

## 7. Background Worker 설계

### 7.1 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│              Background Service Worker                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐                                       │
│  │Message Hub   │◄──────┐                               │
│  │              │       │                               │
│  └──────┬───────┘       │                               │
│         │               │                               │
│         ├───────────────┼──────────────┐                │
│         │               │              │                │
│         ▼               ▼              ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │Cache Manager │ │API Client   │ │Storage       │    │
│  │              │ │             │ │Manager       │    │
│  └──────┬───────┘ └──────┬───────┘ └──────────────┘    │
│         │                │                               │
│         │                │                               │
│         ▼                ▼                               │
│  ┌──────────────┐ ┌──────────────┐                      │
│  │IndexedDB     │ │Backend API   │                      │
│  │              │ │              │                      │
│  └──────────────┘ └──────────────┘                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.2 핵심 컴포넌트

**Message Hub (`message-hub.ts`)**
- Chrome Runtime 메시지 수신
- 메시지 타입별 라우팅
- 비동기 메시지 처리
- 에러 응답

**Cache Manager (`cache-manager.ts`)**
- IndexedDB CRUD 연산
- TTL 기반 만료 처리
- 캐시 통계 수집
- 캐시 정리 (Cleanup)

**API Client (`api-client.ts`)**
- Backend HTTP 통신
- 요청 큐 관리
- 속도 제한 (Rate Limiting)
- 재시도 로직 (Exponential Backoff)
- 에러 처리

**Storage Manager (`storage-manager.ts`)**
- Chrome Storage API 래핑
- 사용자 설정 동기화
- 로컬/동기 스토리지 분리

### 7.3 이벤트 핸들러

- `chrome.runtime.onMessage`: Content Script 메시지
- `chrome.storage.onChanged`: 설정 변경 감지
- `chrome.tabs.onUpdated`: 페이지 이동 감지
- `chrome.alarms`: 주기적 캐시 정리

---

## 8. Backend API 설계

### 8.1 API 엔드포인트

```
POST   /api/terms/analyze    용어 분석 요청
GET    /api/health          서비스 헬스체크
POST   /api/cache/clear     캐시 초기화 (관리자)
GET    /api/stats           사용 통계 (관리자)
```

### 8.2 상세 설계

**POST /api/terms/analyze**

요청:
```json
{
  "candidates": [
    {
      "text": "Machine Learning",
      "position": { "start": 10, "end": 26 },
      "context": "This is about Machine Learning algorithms",
      "xpath": "/html/body/p[1]"
    }
  ],
  "context": "Full page context...",
  "url": "https://example.com/article",
  "model": "openai"
}
```

응답:
```json
{
  "analyses": [
    {
      "term": "Machine Learning",
      "isRelevant": true,
      "explanation": "A subset of AI that enables systems to learn...",
      "category": "Technology",
      "confidence": 0.95,
      "timestamp": 1717785600000
    }
  ],
  "modelUsed": "openai",
  "processingTime": 1250
}
```

### 8.3 AI Service 설계

**AI Service Interface**
```typescript
interface AIService {
  analyzeTerms(candidates: TermCandidate[], context: string): Promise<TermAnalysis[]>;
  isHealthy(): Promise<boolean>;
}
```

**OpenAI 구현**
- GPT-4 또는 GPT-3.5-turbo 사용
- System prompt: 용어 관련성 판별 지시
- Few-shot examples: 판별 기준 학습
- Streaming: 대량 요청 시 스트리밍 고려

**Gemini 구현**
- Gemini Pro 사용
- OpenAI와 동일한 인터페이스
- Fallback 전략: OpenAI 실패 시 Gemini로 전환

### 8.4 캐시 서비스

**Redis 캐시 (프로덕션)**
- 키 구조: `term:{hash(term)}:{hash(context)}`
- TTL: 7일 (기본)
- LRU eviction policy

**In-memory 캐시 (개발)**
- Map 기반 구현
- 메모리 제한: 100MB
- 주기적 cleanup

### 8.5 속도 제한

- IP 기반: 100 requests/minute
- API Key 기반: 1000 requests/hour
- 슬라이딩 윈도우 알고리즘

---

## 9. 캐시 설계

### 9.1 다층 캐시 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     Cache Layers                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: Content Script Memory Cache                    │
│  - Map<string, TermAnalysis>                            │
│  - 세션 내 유효                                          │
│  - 가장 빠른 액세스                                      │
│                                                           │
│  Layer 2: IndexedDB (Extension)                          │
│  - 영구 저장                                             │
│  - TTL 기반 만료                                         │
│  - 오프라인 지원                                         │
│                                                           │
│  Layer 3: Redis (Backend)                                │
│  - 서버 사이드 캐시                                      │
│  - 여러 클라이언트 공유                                  │
│  - 중앙 집중式 관리                                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 9.2 캐시 키 설계

**IndexedDB 캐시 키**
```typescript
interface CacheKey {
  term: string;
  contextHash: string;  // SHA-256 hash of context
  model: string;        // 'openai' | 'gemini'
}
```

**Redis 캐시 키**
```
term:{term_hash}:{context_hash}:{model}
```

### 9.3 캐시 전략

**Cache-Aside Pattern**
1. 캐시 조회
2. 히트 시 반환
3. 미스 시 API 호출
4. 결과 캐싱
5. 클라이언트에 반환

**TTL 전략**
- IndexedDB: 30일
- Redis: 7일
- Memory: 세션 종료 시

**캐시 무효화**
- 명시적 무횡화 (사용자 요청)
- TTL 만료
- 용량 초과 시 LRU eviction

### 9.4 캐시 통계

- Hit Rate: 캐시 히트율 모니터링
- Size: 캐시 크기 추적
- Evictions: eviction 횟수 기록

---

## 10. 향후 확장 전략

### 10.1 단계 1: 기본 기능 (현재)
- 패턴 기반 용어 추출
- AI 기반 판별
- 기본 하이라이트
- 캐시 최적화

### 10.2 단계 2: 고급 기능
- **다국어 지원**: 영어 외 다른 언어 패턴 추가
- **도메인 인식**: 페이지 도메인 기반 판별 정책
- **사용자 피드백**: 용어 관련성 사용자 평가
- **학습 시스템**: 피드백 기반 모델 개선

### 10.3 단계 3: 협업 기능
- **공용 용어집**: 사용자 커뮤니티 기반 용어집
- **용어 제안**: 새로운 용어 제출 시스템
- **팀 기능**: 조직 내 공유 용어집

### 10.4 단계 4: AI 고도화
- **파인튜닝**: 도메인별 파인튜닝 모델
- **로컬 AI**: WebAssembly 기반 로컬 추론
- **멀티모달**: 이미지 내 텍스트 용어 감지

### 10.5 단계 5: 플랫폼 확장
- **Firefox Extension**: 호환성 확장
- **Safari Extension**: macOS 지원
- **Mobile App**: iOS/Android 앱

---

## 11. 개발 우선순위

### Phase 1: 핵심 인프라 (Week 1-2)
1. **프로젝트 구조 설정**
   - 폴더 구조 생성
   - TypeScript 설정
   - 빌드 시스템 구성

2. **공유 타입 정의**
   - TypeScript 인터페이스
   - 메시지 타입
   - 설정 타입

3. **IndexedDB 스키마 설계**
   - 데이터베이스 초기화
   - Repository 구현

### Phase 2: Content Script (Week 3-4)
4. **DOM Analyzer 구현**
   - 텍스트 노드 추출
   - MutationObserver

5. **Term Extractor 구현**
   - 패턴 기반 추출
   - 정규식 최적화

6. **Highlighter 구현**
   - DOM 조작
   - CSS 스타일링

7. **Message Handler 구현**
   - Background Worker 통신

### Phase 3: Background Worker (Week 5-6)
8. **Message Hub 구현**
   - 메시지 라우팅

9. **Cache Manager 구현**
   - IndexedDB CRUD
   - TTL 관리

10. **Storage Manager 구현**
    - Chrome Storage 통합

### Phase 4: Backend API (Week 7-8)
11. **API Server 구현**
    - Express/Fastify 설정
    - 라우트 정의

12. **AI Service 구현**
    - OpenAI 통합
    - Gemini 통합

13. **Cache Service 구현**
    - Redis/In-memory

14. **API Client 구현**
    - Background Worker 통신

### Phase 5: UI 개발 (Week 9-10)
15. **Popup UI 구현**
    - React 컴포넌트
    - 설정 패널

16. **Options UI 구현**
    - 전체 설정 페이지

17. **Tooltip Manager 구현**
    - Content Script 통합

### Phase 6: 통합 및 테스트 (Week 11-12)
18. **엔드투엔드 통합**
    - 전체 흐름 테스트

19. **성능 최적화**
    - 캐시 튜닝
    - 디바운싱

20. **에러 처리**
    - 전역 에러 핸들링
    - 사용자 피드백

### Phase 7: 배포 (Week 13-14)
21. **Chrome Web Store 준비**
    - 아이콘, 스크린샷
    - 설명 작성

22. **배포 및 모니터링**
    - 버전 관리
    - 버그 리포트

---

## 총괄

이 아키텍처는 다음 원칙을 따릅니다:

1. **사전 비의존성**: 하드코딩된 용어 목록 없이 AI 기반 판별
2. **성능 최적화**: 다층 캐시로 API 호출 최소화
3. **확장성**: 모듈화된 설계로 기능 추가 용이
4. **사용자 경험**: 실시간 하이라이트와 툴팁으로 자연스러운 UX
5. **프라이버시**: 로컬 캐시와 선택적 API 호출

개발은 위 우선순위에 따라 진행하며, 각 Phase 완료 후 검증을 거쳐 다음 단계로 진행합니다.