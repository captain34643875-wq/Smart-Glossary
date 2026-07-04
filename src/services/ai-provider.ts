/**
 * AI Provider Interface and Implementations
 * 
 * Supports multiple AI providers (OpenAI, Gemini) with a unified interface.
 * Only sends selected text to AI, not entire page content.
 */

import { ExplanationRequest, ExplanationResult } from '../shared/types';

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  /** Provider type (openai, gemini) */
  type: 'openai' | 'gemini';
  /** API key */
  apiKey: string;
  /** Model name */
  model?: string;
  /** API endpoint (optional, for custom endpoints) */
  endpoint?: string;
}

/**
 * AI Provider interface
 */
export interface AIProvider {
  /**
   * Explain a term using AI
   * 
   * @param term - Term to explain
   * @returns Promise with explanation result
   */
  explain(request: ExplanationRequest): Promise<ExplanationResult>;
  
  /**
   * Get provider name
   * 
   * @returns Provider name
   */
  getProviderName(): string;
}

/**
 * Base prompt for explanation
 * Designed to produce 3-5 sentences, middle-school level, with examples, 100-200 characters
 */
function buildExplanationPrompt(request: ExplanationRequest): string {
  return `Explain the selected text using the surrounding page context.

Selected text:
${request.term}

Context before:
${request.contextBefore || '(none)'}

Context after:
${request.contextAfter || '(none)'}

Write for a student. Do not include greetings, introductions, or extra closing text.
Always answer in this exact Markdown format:

1. **One-line definition**
   - ...

2. **Easy explanation**
   - ...

3. **Meaning in this context**
   - ...

4. **Example sentence**
   - ...

5. **Related concepts or similar terms**
   - ...`;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig;
  private endpoint: string;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions';
  }

  async explain(request: ExplanationRequest): Promise<ExplanationResult> {
    try {
      const prompt = buildExplanationPrompt(request);
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 700,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const explanation = data.choices?.[0]?.message?.content?.trim() || '';

      if (!explanation) {
        throw new Error('No explanation received from OpenAI');
      }

      return {
        explanation,
        provider: 'openai',
        timestamp: Date.now(),
        success: true,
      };
    } catch (error) {
      return {
        explanation: '',
        provider: 'openai',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return 'OpenAI';
  }
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProvider implements AIProvider {
  private config: AIProviderConfig;
  private endpoint: string;

  constructor(config: AIProviderConfig) {
    this.config = config;
    const model = config.model || 'gemini-pro';
    this.endpoint = config.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }

  async explain(request: ExplanationRequest): Promise<ExplanationResult> {
    try {
      const prompt = buildExplanationPrompt(request);
      
      const url = new URL(this.endpoint);
      url.searchParams.append('key', this.config.apiKey);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (!explanation) {
        throw new Error('No explanation received from Gemini');
      }

      return {
        explanation,
        provider: 'gemini',
        timestamp: Date.now(),
        success: true,
      };
    } catch (error) {
      return {
        explanation: '',
        provider: 'gemini',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return 'Gemini';
  }
}

/**
 * Factory function to create AI provider based on config
 * 
 * @param config - AI provider configuration
 * @returns AI provider instance
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    default:
      throw new Error(`Unsupported provider type: ${config.type}`);
  }
}

/**
 * Mock AI Provider for testing (no API calls)
 */
export class MockAIProvider implements AIProvider {
  private delay: number;

  constructor(delay: number = 500) {
    this.delay = delay;
  }

  async explain(request: ExplanationRequest): Promise<ExplanationResult> {
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const mockExplanation = `1. **One-line definition**
   - ${request.term} is an important idea or term in this passage.

2. **Easy explanation**
   - It means something the reader should understand before continuing.

3. **Meaning in this context**
   - Here, it connects to the surrounding sentence and helps explain the main point.

4. **Example sentence**
   - For example, "${request.term}" can be used to explain a concept clearly.

5. **Related concepts or similar terms**
   - Related ideas depend on the page context.`;

    return {
      explanation: mockExplanation,
      provider: 'mock',
      timestamp: Date.now(),
      success: true,
    };
  }

  getProviderName(): string {
    return 'Mock';
  }
}
