import { callOpenAI } from "@/lib/openai";
import type { Language } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMessages = [{ role: "user" as const, content: "Hello" }];
const mockLanguage: Language = "en";

describe("callOpenAI", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("throws with code unauthorized when OPENAI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    await expect(callOpenAI(mockMessages, mockLanguage)).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("throws with code unauthorized on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" }),
    );

    await expect(callOpenAI(mockMessages, mockLanguage)).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("throws with code rate_limited after exhausting retries", async () => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" }),
    );

    await expect(callOpenAI(mockMessages, mockLanguage)).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
      .mockResolvedValue({ ok: true, body: stream });
    vi.stubGlobal("fetch", mockFetch);

    const response = await callOpenAI(mockMessages, mockLanguage);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(true);
  });

  it("throws with code api_error on other HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" }),
    );

    await expect(callOpenAI(mockMessages, mockLanguage)).rejects.toMatchObject({
      code: "api_error",
    });
  });

  it("throws with code network_error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(callOpenAI(mockMessages, mockLanguage)).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("sends the system prompt and user messages in the request body", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, body: stream });
    vi.stubGlobal("fetch", mockFetch);

    await callOpenAI(mockMessages, mockLanguage);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.stream).toBe(true);
    const messages = body.messages as Array<{ role: string; content: string }>;
    expect(messages[0]?.role).toBe("system");
    // biome-ignore lint/style/noNonNullAssertion: messages[1] is always defined
    expect(messages[1]!).toEqual({ role: "user", content: "Hello" });
  });

  it("uses OPENAI_MODEL env var when set", async () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-4o");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, body: stream });
    vi.stubGlobal("fetch", mockFetch);

    await callOpenAI(mockMessages, mockLanguage);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("gpt-4o");
  });

  it("returns an ok response on successful API call", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: stream }));

    const response = await callOpenAI(mockMessages, mockLanguage);
    expect(response.ok).toBe(true);
  });
});
