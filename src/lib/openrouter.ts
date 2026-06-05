import { buildSystemPrompt } from "@/lib/prompts";
import type { Language, OpenRouterError } from "@/types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";

type SSEDelta = {
  choices: Array<{ delta: { content?: string } }>;
};

function makeError(code: OpenRouterError["code"], message: string): OpenRouterError {
  return { code, message };
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [3000, 6000, 12000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenRouter(
  messages: ChatMessage[],
  language: Language,
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  const body = JSON.stringify({
    model: MODEL,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt(language) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Talk To Me",
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_URL, { method: "POST", headers, body });
    } catch {
      throw makeError("network_error", "Failed to reach OpenRouter");
    }

    if (response.ok) return response;

    if (response.status === 401) throw makeError("unauthorized", "Invalid API key");
    if (response.status === 429) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 12000);
        continue;
      }
      throw makeError("rate_limited", "Rate limit exceeded — please try again in a moment");
    }
    throw makeError("api_error", `OpenRouter error: ${response.statusText}`);
  }

  throw makeError("api_error", "Unexpected end of retry loop");
}

export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as SSEDelta;
        const content = parsed.choices[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export async function* streamChat(
  messages: ChatMessage[],
  language: Language,
): AsyncGenerator<string> {
  const response = await callOpenRouter(messages, language);
  if (!response.body) throw makeError("api_error", "No response body");
  yield* parseSSEStream(response.body);
}
