import {
  base64Encode,
  base64ToInt16,
  float32ToInt16,
  int16ToFloat32,
  isRealtimeSupported,
} from "@/lib/realtime";
import { RealtimeSession } from "@/lib/realtime";
import type { RealtimeCallbacks } from "@/lib/realtime";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("float32ToInt16", () => {
  it("converts Float32Array to Int16Array", () => {
    const input = new Float32Array([0.5, -0.5, 1.0, -1.0, 0.0]);
    const result = float32ToInt16(input);
    expect(result).toBeInstanceOf(Int16Array);
    expect(result.length).toBe(5);
  });

  it("clamps values to [-1, 1]", () => {
    const input = new Float32Array([2.0, -2.0, 1.5, -1.5]);
    const result = float32ToInt16(input);
    const expected = new Int16Array([32767, -32768, 32767, -32768]);
    expect(result).toEqual(expected);
  });

  it("handles mixed positive and negative values", () => {
    const input = new Float32Array([0.5, -0.25, 0.0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(16383);
    expect(result[1]).toBe(-8192);
    expect(result[2]).toBe(0);
  });

  it("handles empty array", () => {
    const result = float32ToInt16(new Float32Array([]));
    expect(result.length).toBe(0);
  });
});

describe("int16ToFloat32", () => {
  it("converts Int16Array to Float32Array", () => {
    const input = new Int16Array([16384, -8192, 0, 32767, -32768]);
    const result = int16ToFloat32(input);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(5);
  });

  it("preserves sign and scale", () => {
    const input = new Int16Array([16384, -8192]);
    const result = int16ToFloat32(input);
    expect(result[0]).toBeCloseTo(0.5, 4);
    expect(result[1]).toBeCloseTo(-0.25, 4);
  });

  it("handles empty array", () => {
    const result = int16ToFloat32(new Int16Array([]));
    expect(result.length).toBe(0);
  });
});

describe("base64Encode", () => {
  it("encodes an ArrayBuffer to base64", () => {
    const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer;
    const result = base64Encode(buffer);
    expect(result).toBe("SGVsbG8=");
  });

  it("encodes empty buffer", () => {
    const buffer = new Uint8Array([]).buffer;
    const result = base64Encode(buffer);
    expect(result).toBe("");
  });
});

describe("base64ToInt16", () => {
  it("decodes base64 to Int16Array", () => {
    const result = base64ToInt16("AAA=");
    expect(result).toBeInstanceOf(Int16Array);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
  });

  it("round-trips through base64Encode and base64ToInt16", () => {
    const original = new Int16Array([100, -200, 0, 1]);
    const encoded = base64Encode(original.buffer);
    const decoded = base64ToInt16(encoded);
    expect(decoded).toEqual(original);
  });
});

describe("isRealtimeSupported", () => {
  it("returns false when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(isRealtimeSupported()).toBe(false);
  });

  it("returns false when getUserMedia is missing", () => {
    vi.stubGlobal("navigator", { mediaDevices: undefined });
    vi.stubGlobal("AudioContext", () => {});
    expect(isRealtimeSupported()).toBe(false);
  });

  it("returns false when AudioContext is missing", () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn() },
    });
    vi.stubGlobal("AudioContext", undefined);
    expect(isRealtimeSupported()).toBe(false);
  });

  it("returns true when all APIs are available", () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn() },
    });
    vi.stubGlobal("AudioContext", () => {});
    expect(isRealtimeSupported()).toBe(true);
  });
});

function makeCallbacks(): RealtimeCallbacks {
  return {
    onUserTranscript: vi.fn(),
    onAssistantDelta: vi.fn(),
    onStatusChange: vi.fn(),
    onError: vi.fn(),
  };
}

const mockAudioCtx = {
  sampleRate: 48000,
  createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
  createScriptProcessor: vi.fn().mockReturnValue({
    disconnect: vi.fn(),
    connect: vi.fn(),
  }),
  createBuffer: vi
    .fn()
    .mockReturnValue({ getChannelData: vi.fn().mockReturnValue(new Float32Array(100)) }),
  createBufferSource: vi.fn().mockReturnValue({ buffer: null, connect: vi.fn(), start: vi.fn() }),
  destination: {},
  close: vi.fn().mockResolvedValue(undefined),
};

const mockStream = {
  getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
};

describe("RealtimeSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("constructs and stores callbacks and config", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    expect(session).toBeInstanceOf(RealtimeSession);
  });

  it("calls onStatusChange('idle') after stop", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session.stop();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("idle");
  });

  it("calls onStatusChange('connecting') on start", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session.start();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("connecting");
  });

  it("does not call start twice if already active", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["active"] = true;
    session.start();
    expect(callbacks.onStatusChange).not.toHaveBeenCalled();
  });

  it("calls onError when fetch fails on start", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    await session.start();
    expect(callbacks.onError).toHaveBeenCalledWith("Network error");
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("error");
  });

  it("calls onError when token fetch returns non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
      }),
    );
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    await session.start();
    expect(callbacks.onError).toHaveBeenCalledWith("Unauthorized");
  });

  it("handles response.audio_transcript.delta", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](
      JSON.stringify({ type: "response.audio_transcript.delta", delta: "Hej" }),
    );
    expect(callbacks.onAssistantDelta).toHaveBeenCalledWith("Hej");
  });

  it("skips response.audio_transcript.delta when delta is missing", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](JSON.stringify({ type: "response.audio_transcript.delta" }));
    expect(callbacks.onAssistantDelta).not.toHaveBeenCalled();
  });

  it("handles speech_started event with status change", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["accumulatedUserTranscript"] = "previous";
    session["handleMessage"](JSON.stringify({ type: "input_audio_buffer.speech_started" }));
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("listening");
    expect(session["accumulatedUserTranscript"]).toBe("");
  });

  it("handles speech_stopped event with status change", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["accumulatedAssistantTranscript"] = "prev";
    session["handleMessage"](JSON.stringify({ type: "input_audio_buffer.speech_stopped" }));
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("responding");
    expect(session["accumulatedAssistantTranscript"]).toBe("");
  });

  it("handles response.done with accumulated transcript", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["accumulatedUserTranscript"] = "Hello";
    session["lastUserTranscript"] = "";
    session["handleMessage"](JSON.stringify({ type: "response.done" }));
    expect(callbacks.onUserTranscript).toHaveBeenCalledWith("Hello");
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("listening");
  });

  it("skips onUserTranscript when transcript unchanged", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["accumulatedUserTranscript"] = "Hello";
    session["lastUserTranscript"] = "Hello";
    session["handleMessage"](JSON.stringify({ type: "response.done" }));
    expect(callbacks.onUserTranscript).not.toHaveBeenCalled();
  });

  it("skips onUserTranscript when accumulated transcript is empty", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["accumulatedUserTranscript"] = "";
    session["lastUserTranscript"] = "";
    session["handleMessage"](JSON.stringify({ type: "response.done" }));
    expect(callbacks.onUserTranscript).not.toHaveBeenCalled();
  });

  it("handles conversation.item.input_audio_transcription.completed", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](
      JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "Hello",
      }),
    );
    expect(session["accumulatedUserTranscript"]).toBe("Hello");
  });

  it("handles error event type", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](JSON.stringify({ type: "error", error: { message: "API error" } }));
    expect(callbacks.onError).toHaveBeenCalledWith("API error");
  });

  it("responds to session.updated without error", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    expect(() =>
      session["handleMessage"](JSON.stringify({ type: "session.updated" })),
    ).not.toThrow();
  });

  it("responds to conversation.item.created without error", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    expect(() =>
      session["handleMessage"](JSON.stringify({ type: "conversation.item.created" })),
    ).not.toThrow();
  });

  it("handles response.audio.delta by enqueuing audio", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](JSON.stringify({ type: "response.audio.delta", delta: "AAAAAA==" }));
    expect(session["playQueue"].length).toBe(1);
  });

  it("skips response.audio.delta when delta is missing", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["handleMessage"](JSON.stringify({ type: "response.audio.delta" }));
    expect(session["playQueue"].length).toBe(0);
  });

  it("ignores malformed messages", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    expect(() => session["handleMessage"]("not json")).not.toThrow();
  });

  it("enqueues audio data", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["enqueueAudio"]("AAAAAA==");
    expect(session["playQueue"].length).toBe(1);
  });

  it("processPlayQueue returns when queue is empty", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["audioContext"] = mockAudioCtx as unknown as AudioContext;
    session["isPlaying"] = true;
    session["processPlayQueue"]();
    expect(session["isPlaying"]).toBe(false);
  });

  it("cleanup disconnects resources without error", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["ws"] = { close: vi.fn() } as unknown as WebSocket;
    session["mediaStream"] = mockStream as unknown as MediaStream;
    session["scriptProcessor"] = { disconnect: vi.fn() } as unknown as ScriptProcessorNode;
    session["audioSource"] = { disconnect: vi.fn() } as unknown as MediaStreamAudioSourceNode;
    session["audioContext"] = mockAudioCtx as unknown as AudioContext;
    session["playQueue"] = ["data"];
    session["isPlaying"] = true;
    session["cleanup"]();
    expect(session["playQueue"].length).toBe(0);
    expect(session["isPlaying"]).toBe(false);
  });

  it("stopMediaStream calls stop on each track", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    const trackStop = vi.fn();
    session["mediaStream"] = {
      getTracks: vi.fn().mockReturnValue([{ stop: trackStop }]),
    } as unknown as MediaStream;
    session["stopMediaStream"]();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(session["mediaStream"]).toBeNull();
  });

  it("startRecording calls onError when getUserMedia fails", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Mic denied")),
      },
    });
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    await session["startRecording"]();
    expect(callbacks.onError).toHaveBeenCalledWith("Mic denied");
  });

  it("processPlayQueue processes audio data", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["audioContext"] = mockAudioCtx as unknown as AudioContext;
    session["playQueue"] = ["AAAAAA=="];
    expect(() => session["processPlayQueue"]()).not.toThrow();
    expect(mockAudioCtx.createBuffer).toHaveBeenCalled();
    expect(mockAudioCtx.createBufferSource).toHaveBeenCalled();
  });

  it("processPlayQueue handles corrupt audio data gracefully", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["audioContext"] = mockAudioCtx as unknown as AudioContext;
    session["playQueue"] = ["invalid-base64!!"];
    expect(() => session["processPlayQueue"]()).not.toThrow();
  });

  it("does not call connectWebSocket when session becomes inactive after token fetch", async () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["fetchToken"] = vi.fn().mockResolvedValue("token");
    const connectSpy = vi.fn();
    session["connectWebSocket"] = connectSpy;

    const startPromise = session.start();
    session.stop();
    await startPromise;

    expect(connectSpy).not.toHaveBeenCalled();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("connecting");
  });

  it("cleanup handles already-null resources gracefully", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["scriptProcessor"] = null;
    session["audioSource"] = null;
    expect(() => session["cleanup"]()).not.toThrow();
    expect(session["scriptProcessor"]).toBeNull();
    expect(session["audioSource"]).toBeNull();
  });

  it("fetchToken handles error response without error field", async () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      }),
    );
    await session.start();
    expect(callbacks.onError).toHaveBeenCalledWith("Token request failed (500)");
  });

  it("startRecording stops early if session becomes inactive after getUserMedia", async () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        }),
      },
    });
    session["active"] = false;
    await session["startRecording"]();
    expect(callbacks.onStatusChange).not.toHaveBeenCalledWith("listening");
  });

  it("processPlayQueue when base64 is null after shift", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["audioContext"] = mockAudioCtx as unknown as AudioContext;
    session["playQueue"] = [undefined as unknown as string];
    expect(() => session["processPlayQueue"]()).not.toThrow();
    expect(session["isPlaying"]).toBe(false);
  });

  it("stopMediaStream handles null mediaStream", () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["mediaStream"] = null;
    expect(() => session["stopMediaStream"]()).not.toThrow();
  });

  it("handles non-Error throw from fetchToken", async () => {
    const callbacks = makeCallbacks();
    const session = new RealtimeSession(callbacks, { voice: "echo", language: "en" });
    session["fetchToken"] = vi.fn().mockRejectedValue("string error");
    await session.start();
    expect(callbacks.onError).toHaveBeenCalledWith("Failed to start session");
  });
});
