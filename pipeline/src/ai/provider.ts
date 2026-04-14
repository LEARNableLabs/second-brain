export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

export interface LLMConfig {
  provider: 'claude' | 'ollama';
  model?: string;
  apiKey?: string;
  ollamaUrl?: string;
}

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'claude':
      return createClaudeProvider(config);
    case 'ollama':
      return createOllamaProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

function createClaudeProvider(config: LLMConfig): LLMProvider {
  // Lazy import to avoid loading SDK when using Ollama
  return {
    async complete(prompt: string): Promise<string> {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: config.apiKey });
      const response = await client.messages.create({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = response.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type');
      return block.text;
    },
  };
}

function createOllamaProvider(config: LLMConfig): LLMProvider {
  const baseUrl = config.ollamaUrl || 'http://localhost:11434';
  const model = config.model || 'llama3.1';

  return {
    async complete(prompt: string): Promise<string> {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = await response.json() as { response: string };
      return data.response;
    },
  };
}
