import { buildSystemPrompt } from "@/lib/prompts";
import type { Language, OpenRouterError, Topic } from "@/types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function makeError(code: OpenRouterError["code"], message: string): OpenRouterError {
  return { code, message };
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [3000, 6000, 12000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenAI(
  messages: ChatMessage[],
  language: Language,
  topic?: Topic,
): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw makeError("unauthorized", "OpenAI API key not configured");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const body = JSON.stringify({
    model,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt(language, topic) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(OPENAI_URL, { method: "POST", headers, body });
    } catch {
      throw makeError("network_error", "Failed to reach OpenAI");
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
    throw makeError("api_error", `OpenAI error: ${response.statusText}`);
  }

  throw makeError("api_error", "Unexpected end of retry loop");
}
