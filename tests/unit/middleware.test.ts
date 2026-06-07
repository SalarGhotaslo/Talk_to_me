// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

function makeRequest(authorization?: string) {
  return {
    headers: new Map(Object.entries(authorization ? { authorization } : {})),
  };
}

async function loadMiddleware() {
  vi.resetModules();
  const mod = await import("@/middleware");
  return mod.middleware;
}

describe("middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when no auth header is present", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const middleware = await loadMiddleware();
    const response = middleware(makeRequest() as never);
    expect(response.status).toBe(401);
  });

  it("returns 401 when auth header is not Basic", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const middleware = await loadMiddleware();
    const response = middleware(makeRequest("Bearer token123") as never);
    expect(response.status).toBe(401);
  });

  it("returns 401 when credentials are wrong", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const middleware = await loadMiddleware();
    const encoded = btoa("wrong:password");
    const response = middleware(makeRequest(`Basic ${encoded}`) as never);
    expect(response.status).toBe(401);
  });

  it("returns 401 when env vars are not set", async () => {
    const middleware = await loadMiddleware();
    const encoded = btoa("admin:secret");
    const response = middleware(makeRequest(`Basic ${encoded}`) as never);
    expect(response.status).toBe(401);
  });

  it("returns 200 when credentials match", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const middleware = await loadMiddleware();
    const encoded = btoa("admin:secret");
    const response = middleware(makeRequest(`Basic ${encoded}`) as never);
    expect(response.status).toBe(200);
  });

  it("allows access when user has colon in password", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "pass:word");
    const middleware = await loadMiddleware();
    const encoded = btoa("admin:pass:word");
    const response = middleware(makeRequest(`Basic ${encoded}`) as never);
    expect(response.status).toBe(200);
  });

  it("returns Unauthorized body on 401", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "admin");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const middleware = await loadMiddleware();
    const response = middleware(makeRequest() as never);
    const text = await response.text();
    expect(text).toBe("Unauthorized");
  });
});
