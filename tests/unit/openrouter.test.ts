import { type ChatMessage, streamChat } from "@/lib/openrouter";
import type { Language } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMessages: ChatMessage[] = [{ role: "user", content: "Hello" }];
const mockLanguage: Language = "en";

describe("streamChat", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("throws OpenRouterError with code unauthorized on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    await expect(streamChat(mockMessages, mockLanguage).next()).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("throws OpenRouterError with code rate_limited on 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      }),
    );

    await expect(streamChat(mockMessages, mockLanguage).next()).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("throws OpenRouterError with code api_error on other HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(streamChat(mockMessages, mockLanguage).next()).rejects.toMatchObject({
      code: "api_error",
    });
  });

  it("throws OpenRouterError with code network_error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(streamChat(mockMessages, mockLanguage).next()).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("yields text chunks from SSE stream", async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of sseChunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const chunks: string[] = [];
    for await (const chunk of streamChat(mockMessages, mockLanguage)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips SSE lines without content delta", async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of sseChunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: stream }));

    const chunks: string[] = [];
    for await (const chunk of streamChat(mockMessages, mockLanguage)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hi"]);
  });
});
