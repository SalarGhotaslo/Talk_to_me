// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/speak", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 400 when text is missing", async () => {
    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when language is invalid", async () => {
    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", language: "zz" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is empty", async () => {
    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "", language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 503 when OPENAI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("streams audio back from OpenAI on success", async () => {
    const fakeAudio = new Uint8Array([1, 2, 3]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(c) {
            c.enqueue(fakeAudio);
            c.close();
          },
        }),
      }),
    );

    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello there", language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("calls OpenAI with the correct model, voice and text", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hej världen", language: "sv" }),
    });
    await POST(req);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.model).toBe("tts-1-hd");
    expect(body.voice).toBe("alloy");
    expect(body.input).toBe("Hej världen");
    expect(body.response_format).toBe("mp3");
    expect(body.speed).toBe(0.9);
  });

  it("calls OpenAI with correct config for Turkish", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Merhaba", language: "tr" }),
    });
    await POST(req);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.model).toBe("tts-1-hd");
    expect(body.voice).toBe("alloy");
    expect(body.input).toBe("Merhaba");
    expect(body.response_format).toBe("mp3");
    expect(body.speed).toBe(0.9);
  });

  it("returns 502 when OpenAI is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("forwards OpenAI error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" }),
    );

    const { POST } = await import("@/app/api/speak/route");
    const req = new Request("http://localhost/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", language: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
