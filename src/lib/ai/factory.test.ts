import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAIProvider } from './factory';
import { GeminiProvider } from './gemini-provider';
import { GroqProvider } from './groq-provider';

describe('AIProvider Factory', () => {
  const originalEnv = process.env.AI_PROVIDER;

  beforeEach(() => {
    delete process.env.AI_PROVIDER;
  });

  afterEach(() => {
    process.env.AI_PROVIDER = originalEnv;
  });

  it('returns GeminiProvider by default when AI_PROVIDER is not set', () => {
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('returns GeminiProvider when AI_PROVIDER=gemini', () => {
    process.env.AI_PROVIDER = 'gemini';
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('returns GroqProvider when AI_PROVIDER=groq', () => {
    process.env.AI_PROVIDER = 'groq';
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(GroqProvider);
  });
});
