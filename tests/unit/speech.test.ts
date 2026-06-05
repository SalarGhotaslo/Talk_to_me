import { isSTTSupported, isTTSSupported, speak, startListening } from "@/lib/speech";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isSTTSupported", () => {
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
    expect(mockRecognition.lang).toBe("fa-IR");
  });

  it("sets the correct BCP-47 lang for Spanish", () => {
    startListening("es", vi.fn(), vi.fn());
    expect(mockRecognition.lang).toBe("es-ES");
  });

  it("calls start on the recognition instance", () => {
    startListening("en", vi.fn(), vi.fn());
    expect(mockRecognition.start).toHaveBeenCalledOnce();
  });

  it("returns a stop function", () => {
    const stop = startListening("en", vi.fn(), vi.fn());
    stop();
    expect(mockRecognition.stop).toHaveBeenCalledOnce();
  });

  it("calls onResult with transcript when speech is recognised", () => {
    const onResult = vi.fn();
    startListening("en", onResult, vi.fn());

    const mockEvent = {
      results: [[{ transcript: "Hello world" }]],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent;

    mockRecognition.onresult?.(mockEvent);
    expect(onResult).toHaveBeenCalledWith("Hello world");
  });

  it("calls onEnd when recognition ends", () => {
    const onEnd = vi.fn();
    startListening("en", vi.fn(), onEnd);
    mockRecognition.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
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
    expect(lastUtterance.lang).toBe("fa-IR");
  });
});
