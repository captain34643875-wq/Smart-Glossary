/**
 * AI Provider Interface and Implementations
 * 
 * Supports multiple AI providers (OpenAI, Gemini) with a unified interface.
 * Only sends selected text to AI, not entire page content.
 */

import { ExplanationResult } from '../shared/types';

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
  explain(term: string): Promise<ExplanationResult>;
  
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
const EXPLANATION_PROMPT = `Explain the following term in 3-5 sentences that a middle school student can understand. Include a simple example. Keep the explanation between 100-200 characters.

Term: "{term}"

Explanation:`;

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

  async explain(term: string): Promise<ExplanationResult> {
    try {
      const prompt = EXPLANATION_PROMPT.replace('{term}', term);
      
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
          max_tokens: 200,
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
    this.endpoint = config.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async explain(term: string): Promise<ExplanationResult> {
    try {
      const prompt = EXPLANATION_PROMPT.replace('{term}', term);
      
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
            maxOutputTokens: 200,
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

  async explain(term: string): Promise<ExplanationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    // Return mock explanation
    const mockExplanation = `${term} is a concept used in technology. For example, when you use ${term.toLowerCase()}, you're applying this idea to solve a problem efficiently.`;

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
