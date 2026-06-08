import { useRealtimeConversation } from "@/hooks/useRealtimeConversation";
import { isRealtimeSupported } from "@/lib/realtime";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

const mockSession = {
  start: mockStart,
  stop: mockStop,
};

let capturedCallbacks: {
  onUserTranscript: (...args: unknown[]) => void;
  onAssistantDelta: (...args: unknown[]) => void;
  onStatusChange: (...args: unknown[]) => void;
  onError: (...args: unknown[]) => void;
} | null = null;

vi.mock("@/lib/realtime", () => ({
  RealtimeSession: vi.fn(function (
    this: unknown,
    callbacks: {
      onUserTranscript: (...args: unknown[]) => void;
      onAssistantDelta: (...args: unknown[]) => void;
      onStatusChange: (...args: unknown[]) => void;
      onError: (...args: unknown[]) => void;
    },
  ) {
    capturedCallbacks = callbacks;
    return mockSession;
  }),
  isRealtimeSupported: vi.fn(),
}));

describe("useRealtimeConversation", () => {
  beforeEach(() => {
    vi.mocked(isRealtimeSupported).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns isSupported as true when realtime is available", () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    expect(result.current.isSupported).toBe(true);
  });

  it("returns isSupported as false when realtime is not available", () => {
    vi.mocked(isRealtimeSupported).mockReturnValue(false);

    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    expect(result.current.isSupported).toBe(false);
  });

  it("starts session when start is called", async () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledOnce();
    });
  });

  it("stops session when stop is called", () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    act(() => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalledOnce();
  });

  it("stops session on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(mockStop).toHaveBeenCalledOnce();
  });

  it("returns idle status initially", () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    expect(result.current.status).toBe("idle");
  });

  it("resets status to idle after stop", () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("idle");
  });

  it("updates status via handleStatusChange callback", async () => {
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedCallbacks?.onStatusChange("listening");
    });

    expect(result.current.status).toBe("listening");
  });

  it("calls onError via handleError callback", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeConversation({
        language: "en",
        voice: "echo",
        onUserMessage: vi.fn(),
        onAssistantDelta: vi.fn(),
        onError,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      capturedCallbacks?.onError("test error");
    });

    expect(onError).toHaveBeenCalledWith("test error");
  });
});
