// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/realtime/token", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 400 when body is missing", async () => {
    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when language is invalid", async () => {
    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "zz", voice: "echo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 503 when OPENAI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en", voice: "echo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("returns 502 when OpenAI is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en", voice: "echo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("returns 502 when OpenAI returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request"),
      }),
    );

    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en", voice: "echo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("returns ephemeral key on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          client_secret: { value: "sess-abc123" },
        }),
      }),
    );

    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en", voice: "echo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ephemeral_key: string };
    expect(body.ephemeral_key).toBe("sess-abc123");
  });

  it("defaults voice to verse when not provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          client_secret: { value: "sess-default" },
        }),
      }),
    );

    const { POST } = await import("@/app/api/realtime/token/route");
    const req = new Request("http://localhost/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ephemeral_key: string };
    expect(body.ephemeral_key).toBe("sess-default");
  });
});
