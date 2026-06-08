import {
  isSTTSupported,
  isTTSSupported,
  prepareForTTS,
  resetAudioState,
  speak,
  speakWithOpenAI,
  startListening,
  unlockAudio,
} from "@/lib/speech";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  resetAudioState();
});

describe("isSTTSupported", () => {
  it("returns false when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(isSTTSupported()).toBe(false);
  });

  it("returns true when SpeechRecognition is available", () => {
    vi.stubGlobal("SpeechRecognition", function SpeechRecognition() {});
    expect(isSTTSupported()).toBe(true);
  });

  it("returns true when webkitSpeechRecognition is available", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", function webkitSpeechRecognition() {});
    expect(isSTTSupported()).toBe(true);
  });

  it("returns false when neither API is available", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    expect(isSTTSupported()).toBe(false);
  });
});

describe("isTTSSupported", () => {
  it("returns true when speechSynthesis is available", () => {
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
    expect(isTTSSupported()).toBe(true);
  });

  it("returns false when speechSynthesis is not available", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    expect(isTTSSupported()).toBe(false);
  });
});

describe("unlockAudio", () => {
  beforeEach(() => {
    resetAudioState();
  });

  it("does nothing when AudioContext is unavailable", () => {
    window.AudioContext = undefined as unknown as typeof AudioContext;
    (window as unknown as Record<string, unknown>).webkitAudioContext = undefined;
    expect(() => unlockAudio()).not.toThrow();
  });

  it("does not throw when AudioContext constructor throws", () => {
    window.AudioContext = class Throwing {
      constructor() {
        throw new Error("no audio");
      }
    } as unknown as typeof AudioContext;
    expect(() => unlockAudio()).not.toThrow();
  });

  it("creates AudioContext and resumes it when suspended", () => {
    let resume: (() => Promise<void>) | undefined;
    window.AudioContext = class MockAudio {
      constructor() {
        (this as unknown as Record<string, unknown>).state = "suspended";
        (this as unknown as Record<string, unknown>).resume = vi
          .fn<() => Promise<void>>()
          .mockResolvedValue(undefined);
        (this as unknown as Record<string, unknown>).sampleRate = 44100;
        (this as unknown as Record<string, unknown>).createBuffer = vi.fn().mockReturnValue({});
        (this as unknown as Record<string, unknown>).createBufferSource = vi.fn().mockReturnValue({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
        });
        (this as unknown as Record<string, unknown>).destination = {};
        resume = (this as unknown as Record<string, unknown>).resume as () => Promise<void>;
      }
    } as unknown as typeof AudioContext;

    unlockAudio();

    expect(resume).toHaveBeenCalledOnce();
  });

  it("does not resume when AudioContext is already running", () => {
    let resume: (() => void) | undefined;
    window.AudioContext = class MockAudio {
      constructor() {
        (this as unknown as Record<string, unknown>).state = "running";
        (this as unknown as Record<string, unknown>).resume = vi.fn();
        resume = (this as unknown as Record<string, unknown>).resume as () => void;
      }
    } as unknown as typeof AudioContext;

    unlockAudio();

    expect(resume).not.toHaveBeenCalled();
  });

  it("is idempotent — second call is a no-op", () => {
    const calls: number[] = [];
    window.AudioContext = class MockAudio {
      constructor() {
        calls.push(1);
        (this as unknown as Record<string, unknown>).state = "suspended";
        (this as unknown as Record<string, unknown>).resume = vi.fn().mockResolvedValue(undefined);
        (this as unknown as Record<string, unknown>).sampleRate = 44100;
        (this as unknown as Record<string, unknown>).createBuffer = vi.fn().mockReturnValue({});
        (this as unknown as Record<string, unknown>).createBufferSource = vi.fn().mockReturnValue({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
        });
        (this as unknown as Record<string, unknown>).destination = {};
      }
    } as unknown as typeof AudioContext;

    unlockAudio();
    unlockAudio();

    expect(calls).toHaveLength(1);
  });

  it("uses webkitAudioContext fallback when AudioContext is missing", () => {
    window.AudioContext = undefined as unknown as typeof AudioContext;
    const calls: number[] = [];
    (window as unknown as Record<string, unknown>).webkitAudioContext = class MockWebkitAudio {
      constructor() {
        calls.push(1);
        (this as unknown as Record<string, unknown>).state = "running";
        (this as unknown as Record<string, unknown>).resume = vi.fn();
      }
    } as unknown as typeof AudioContext;

    unlockAudio();

    expect(calls).toHaveLength(1);
  });
});

describe("startListening", () => {
  type MockRecognition = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };

  let mockRecognition: MockRecognition;

  beforeEach(() => {
    mockRecognition = {
      lang: "",
      continuous: false,
      interimResults: false,
      onresult: null,
      onend: null,
      onerror: null,
      start: vi.fn(),
      stop: vi.fn(),
    };

    const MockSpeechRecognition = vi.fn(function (this: MockRecognition) {
      Object.assign(this, mockRecognition);
      // Keep reference in sync so test can access properties set after construction
      mockRecognition = this as MockRecognition;
    });
    vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
  });

  it("sets the correct BCP-47 lang for English", () => {
    startListening("en", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("en-US");
  });

  it("sets the correct BCP-47 lang for Swedish", () => {
    startListening("sv", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("sv-SE");
  });

  it("sets the correct BCP-47 lang for Farsi", () => {
    startListening("fa", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("fa");
  });

  it("sets the correct BCP-47 lang for Spanish", () => {
    startListening("es", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("es-ES");
  });

  it("sets the correct BCP-47 lang for Turkish", () => {
    startListening("tr", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("tr-TR");
  });

  it("sets the correct BCP-47 lang for French", () => {
    startListening("fr", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("fr-FR");
  });

  it("sets the correct BCP-47 lang for Dutch", () => {
    startListening("nl", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("nl-NL");
  });

  it("calls start on the recognition instance", () => {
    startListening("en", vi.fn(), vi.fn());
    expect(mockRecognition.start).toHaveBeenCalledOnce();
  });

  it("uses continuous listening mode", () => {
    startListening("en", vi.fn(), vi.fn());
    expect(mockRecognition.continuous).toBe(true);
  });

  it("uses interimResults to detect pauses", () => {
    startListening("en", vi.fn(), vi.fn());
    expect(mockRecognition.interimResults).toBe(true);
  });

  it("returns a stop function", () => {
    const stop = startListening("en", vi.fn(), vi.fn());
    stop();
    expect(mockRecognition.stop).toHaveBeenCalledOnce();
  });

  it("calls onResult with transcript after silence timeout", async () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    startListening("en", onResult, vi.fn());

    const mockEvent = {
      results: [Object.assign([{ transcript: "Hello world" }], { isFinal: true })],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    mockRecognition.onresult?.(mockEvent);
    expect(onResult).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    expect(onResult).toHaveBeenCalledWith("Hello world");
    vi.useRealTimers();
  });

  it("resets the silence timer on interim results", async () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    const onEnd = vi.fn();
    startListening("en", onResult, onEnd);

    const finalEvent = {
      results: [Object.assign([{ transcript: "Hello" }], { isFinal: true })],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    const interimEvent = {
      results: [Object.assign([{ transcript: "Hello world" }], { isFinal: false })],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    mockRecognition.onresult?.(finalEvent);
    vi.advanceTimersByTime(1000);

    mockRecognition.onresult?.(interimEvent);
    vi.advanceTimersByTime(3000);

    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith("Hello");
    vi.useRealTimers();
  });

  it("handles result with no alternative", async () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    startListening("en", onResult, vi.fn());

    const emptyAltEvent = {
      results: [Object.assign([], { isFinal: true })],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    mockRecognition.onresult?.(emptyAltEvent);
    vi.advanceTimersByTime(3000);
    expect(onResult).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onEnd when recognition ends", () => {
    const onEnd = vi.fn();
    startListening("en", vi.fn(), onEnd);
    mockRecognition.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("clears the silence timer when recognition ends after a result", () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    const onEnd = vi.fn();
    startListening("en", onResult, onEnd);

    const mockEvent = {
      results: [Object.assign([{ transcript: "Hi" }], { isFinal: true })],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    mockRecognition.onresult?.(mockEvent);
    mockRecognition.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("calls onEnd when recognition errors", () => {
    const onEnd = vi.fn();
    startListening("en", vi.fn(), onEnd);
    mockRecognition.onerror?.(new Event("error") as SpeechRecognitionErrorEvent);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("calls onEnd immediately when SpeechRecognition is unavailable", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const onEnd = vi.fn();
    startListening("en", vi.fn(), onEnd);
    expect(onEnd).toHaveBeenCalledOnce();
  });
});

describe("prepareForTTS", () => {
  it("adds extra space after periods", () => {
    expect(prepareForTTS("Hello world. How are you?", "en")).toBe("Hello world.   How are you?");
  });

  it("adds extra space after question marks", () => {
    expect(prepareForTTS("¿Cómo estás? Muy bien.")).toBe("¿Cómo estás?          Muy bien.");
  });

  it("adds extra space after exclamation marks", () => {
    expect(prepareForTTS("¡Hola! ¿Qué tal?")).toBe("¡Hola!          ¿Qué tal?");
  });

  it("handles single sentence without change", () => {
    expect(prepareForTTS("Hello world.")).toBe("Hello world.");
  });

  it("handles text with no punctuation", () => {
    expect(prepareForTTS("hello")).toBe("hello");
  });

  it("handles empty text", () => {
    expect(prepareForTTS("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(prepareForTTS("  Hello. World.  ", "en")).toBe("Hello.   World.");
  });

  it("handles multiple sentences in Spanish", () => {
    const input = "Hola, ¿cómo estás? Muy bien, gracias. ¿Y tú?";
    const result = prepareForTTS(input);
    expect(result).toBe("Hola,      ¿cómo estás?          Muy bien,      gracias.          ¿Y tú?");
  });

  it("adds long pause after ellipsis for non-English", () => {
    expect(prepareForTTS("Espera… no estoy seguro.")).toBe("Espera…          no estoy seguro.");
  });

  it("adds pause after em-dash for non-English", () => {
    expect(prepareForTTS("Él dijo— y luego se fue.")).toBe("Él dijo—      y luego se fue.");
  });

  it("does not treat em-dash as punctuation for English", () => {
    expect(prepareForTTS("He said— and then left.", "en")).toBe("He said— and then left.");
  });
});

describe("speak", () => {
  type MockUtterance = {
    lang: string;
    voice: SpeechSynthesisVoice | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  };

  let lastUtterance: MockUtterance;

  beforeEach(() => {
    lastUtterance = { lang: "", voice: null, onend: null, onerror: null };

    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      vi.fn(function (this: MockUtterance) {
        Object.assign(this, lastUtterance);
        lastUtterance = this;
      }),
    );

    vi.stubGlobal("speechSynthesis", {
      speak: vi.fn(() => {
        setTimeout(() => lastUtterance.onend?.(), 0);
      }),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    });
  });

  it("calls speechSynthesis.speak with an utterance", async () => {
    await speak("Hello", "en");
    expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
  });

  it("cancels any ongoing speech before starting", async () => {
    await speak("Hello", "en");
    expect(window.speechSynthesis.cancel).toHaveBeenCalledOnce();
  });

  it("sets the correct language on the utterance", async () => {
    await speak("Hej", "sv");
    expect(lastUtterance.lang).toBe("sv-SE");
  });

  it("sets English locale on utterance", async () => {
    await speak("Hello", "en");
    expect(lastUtterance.lang).toBe("en-US");
  });

  it("sets Farsi locale on utterance", async () => {
    await speak("سلام", "fa");
    expect(lastUtterance.lang).toBe("fa");
  });

  it("sets Turkish locale on utterance", async () => {
    await speak("Merhaba", "tr");
    expect(lastUtterance.lang).toBe("tr-TR");
  });

  it("sets French locale on utterance", async () => {
    await speak("Bonjour", "fr");
    expect(lastUtterance.lang).toBe("fr-FR");
  });

  it("sets Dutch locale on utterance", async () => {
    await speak("Hallo", "nl");
    expect(lastUtterance.lang).toBe("nl-NL");
  });

  it("calls onPlaying with true then false on success", async () => {
    const onPlaying = vi.fn();
    await speak("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenNthCalledWith(1, true);
    expect(onPlaying).toHaveBeenNthCalledWith(2, false);
  });

  it("calls onPlaying with false on speech error", async () => {
    vi.stubGlobal("speechSynthesis", {
      speak: vi.fn(() => {
        setTimeout(() => lastUtterance.onerror?.(), 0);
      }),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    });

    const onPlaying = vi.fn();
    await expect(speak("Hello", "en", onPlaying)).rejects.toThrow("Speech synthesis failed");
    expect(onPlaying).toHaveBeenCalledWith(false);
  });

  it("selects a matching voice when available", async () => {
    vi.stubGlobal("speechSynthesis", {
      speak: vi.fn(() => {
        setTimeout(() => lastUtterance.onend?.(), 0);
      }),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([{ lang: "sv-SE", name: "Swedish Voice" }]),
    });

    await speak("Hej", "sv");
    expect(lastUtterance.voice).toEqual({ lang: "sv-SE", name: "Swedish Voice" });
  });

  it("does not select a voice when none match", async () => {
    await speak("Hej", "sv");
    expect(lastUtterance.voice).toBeNull();
  });
});

describe("speakWithOpenAI", () => {
  type MockBufferSource = {
    buffer: AudioBuffer | null;
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  };

  let mockSource: MockBufferSource;

  beforeEach(() => {
    mockSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => {
        queueMicrotask(() => mockSource.onended?.());
      }),
      onended: null,
    };

    vi.stubGlobal(
      "AudioContext",
      // biome-ignore lint/complexity/useArrowFunction: vi.fn is called with `new` by getAudioContext; arrow functions aren't constructors
      vi.fn(function () {
        return {
          state: "running",
          resume: vi.fn().mockResolvedValue(undefined),
          decodeAudioData: vi.fn((_buffer: ArrayBuffer, success: (buffer: AudioBuffer) => void) => {
            success({} as AudioBuffer);
          }),
          createBufferSource: vi.fn(() => mockSource),
          destination: {},
        };
      }),
    );
    vi.stubGlobal("webkitAudioContext", undefined);

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue({
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
          type: "audio/mpeg",
        }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
      }),
    );
  });

  it("fetches /api/speak with the correct body", async () => {
    await speakWithOpenAI("Hello", "en");

    expect(fetch).toHaveBeenCalledWith("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", language: "en" }),
    });
  });

  it("decodes audio and plays via AudioContext", async () => {
    await speakWithOpenAI("Hej", "sv");

    expect(mockSource.connect).toHaveBeenCalledOnce();
    expect(mockSource.start).toHaveBeenCalledOnce();
  });

  it("throws when the API returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(speakWithOpenAI("Hello", "en")).rejects.toThrow();
  });

  it("calls onPlaying with true before playback and false after", async () => {
    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenNthCalledWith(1, true);
    expect(onPlaying).toHaveBeenNthCalledWith(2, false);
  });

  it("calls onPlaying with false when decodeAudioData fails", async () => {
    vi.stubGlobal(
      "AudioContext",
      // biome-ignore lint/complexity/useArrowFunction: vi.fn is called with `new` by getAudioContext; arrow functions aren't constructors
      vi.fn(function () {
        return {
          state: "running",
          resume: vi.fn().mockResolvedValue(undefined),
          decodeAudioData: vi.fn(
            (_buffer: ArrayBuffer, _success: (buffer: AudioBuffer) => void, error: () => void) => {
              error();
            },
          ),
          createBufferSource: vi.fn(() => mockSource),
          destination: {},
        };
      }),
    );

    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenCalledWith(false);
  });

  // HTMLAudioElement fallback tests are skipped in jsdom because jsdom doesn't
  // fire HTMLMediaElement events. On real iOS, AudioContext is always available
  // so the fallback is never reached in this environment.

  it("falls back to HTMLAudioElement when AudioContext is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    const playMock = vi.fn(function (this: { onended: (() => void) | null }) {
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    });

    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: Record<string, unknown>) {
        Object.assign(this, { play: playMock, onended: null, onerror: null });
        return this;
      }),
    );

    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);

    expect(playMock).toHaveBeenCalledOnce();
    expect(onPlaying).toHaveBeenNthCalledWith(1, true);
    expect(onPlaying).toHaveBeenNthCalledWith(2, false);
  });

  it("revokes blob URL in HTMLAudioElement fallback", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    const playMock = vi.fn(function (this: { onended: (() => void) | null }) {
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    });

    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: Record<string, unknown>) {
        Object.assign(this, { play: playMock, onended: null, onerror: null });
        return this;
      }),
    );

    await speakWithOpenAI("Hello", "en");

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("handles HTMLAudioElement onerror in fallback", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: Record<string, unknown>) {
        Object.assign(this, {
          play: vi.fn().mockReturnValue(Promise.resolve()),
          onended: null,
          onerror: null,
        });
        queueMicrotask(() => {
          (this as unknown as { onerror: (() => void) | null }).onerror?.();
        });
        return this;
      }),
    );

    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenCalledWith(false);
  });

  it("handles play() promise rejection in HTMLAudioElement fallback", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: Record<string, unknown>) {
        Object.assign(this, {
          play: vi.fn().mockReturnValue(Promise.reject(new Error("play failed"))),
          onended: null,
          onerror: null,
        });
        return this;
      }),
    );

    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenCalledWith(false);
  });

  it("handles play() returning non-promise in HTMLAudioElement fallback", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: Record<string, unknown>) {
        Object.assign(this, {
          play: vi.fn().mockReturnValue(undefined),
          onended: null,
          onerror: null,
        });
        return this;
      }),
    );

    const onPlaying = vi.fn();
    await speakWithOpenAI("Hello", "en", onPlaying);
    expect(onPlaying).toHaveBeenCalledWith(false);
  });

  it("reuses cached AudioContext on subsequent calls", async () => {
    const mockCtx = {
      state: "running",
      resume: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn((_buffer: ArrayBuffer, success: (buffer: AudioBuffer) => void) => {
        success({} as AudioBuffer);
      }),
      createBufferSource: vi.fn(() => mockSource),
      destination: {},
    };

    vi.stubGlobal(
      "AudioContext",
      // biome-ignore lint/complexity/useArrowFunction: needs constructor for `new AudioContext()`
      vi.fn(function () {
        return mockCtx;
      }),
    );

    await speakWithOpenAI("First", "en");
    await speakWithOpenAI("Second", "en");
    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(2);
  });

  it("resumes suspended AudioContext before playback", async () => {
    const resumeMock = vi.fn().mockResolvedValue(undefined);
    const mockCtx = {
      state: "suspended",
      resume: resumeMock,
      decodeAudioData: vi.fn((_buffer: ArrayBuffer, success: (buffer: AudioBuffer) => void) => {
        success({} as AudioBuffer);
      }),
      createBufferSource: vi.fn(() => mockSource),
      destination: {},
    };

    vi.stubGlobal(
      "AudioContext",
      // biome-ignore lint/complexity/useArrowFunction: needs constructor for `new AudioContext()`
      vi.fn(function () {
        return mockCtx;
      }),
    );

    await speakWithOpenAI("Hello", "en");
    expect(resumeMock).toHaveBeenCalledOnce();
  });
});
