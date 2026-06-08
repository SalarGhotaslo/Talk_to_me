import type { Language } from "@/types";

const LANG_BCP47: Record<Language, string> = {
  en: "en-US",
  sv: "sv-SE",
  fa: "fa-IR",
  es: "es-ES",
  tr: "tr-TR",
  fr: "fr-FR",
  nl: "nl-NL",
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
};

export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithSpeech;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis);
}

type WindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let unlocked = false;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== "closed") return audioContext;
  const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    audioContext = new AudioCtor();
    return audioContext;
  } catch {
    return null;
  }
}

export function resetAudioState(): void {
  unlocked = false;
  if (audioContext) {
    audioContext.close?.()?.catch(() => {});
    audioContext = null;
  }
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    });
  }
}

const SENTENCE_END = /([.!?])(\s)/g;

export function prepareForTTS(text: string): string {
  return text.trim().replace(SENTENCE_END, "$1   ");
}

export function startListening(
  language: Language,
  onResult: (transcript: string) => void,
  onEnd: () => void,
  silenceTimeout = 3000,
): () => void {
  const w = window as WindowWithSpeech;
  const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    onEnd();
    return () => {};
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = LANG_BCP47[language];
  recognition.continuous = true;
  recognition.interimResults = true;

  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = "";

  const clearTimer = () => {
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result?.isFinal) {
        const alt = result[0];
        if (alt) finalTranscript = alt.transcript;
      }
    }
    clearTimer();
    silenceTimer = setTimeout(() => {
      recognition.stop();
      if (finalTranscript) onResult(finalTranscript);
    }, silenceTimeout);
  };

  recognition.onend = () => {
    clearTimer();
    onEnd();
  };

  recognition.onerror = () => {
    clearTimer();
    onEnd();
  };

  recognition.start();

  return () => {
    clearTimer();
    recognition.stop();
  };
}

function playWithAudioContext(
  ctx: AudioContext,
  arrayBuffer: ArrayBuffer,
  onPlaying?: (playing: boolean) => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const ensureRunning = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    ensureRunning.then(() => {
      ctx.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          onPlaying?.(true);
          source.onended = () => {
            onPlaying?.(false);
            resolve();
          };
          source.start();
        },
        () => {
          onPlaying?.(false);
          resolve();
        },
      );
    });
  });
}

function playWithAudioElement(url: string, onPlaying?: (playing: boolean) => void): Promise<void> {
  return new Promise<void>((resolve) => {
    const audio = new Audio(url);
    onPlaying?.(true);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      onPlaying?.(false);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      onPlaying?.(false);
      resolve();
    };
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        URL.revokeObjectURL(url);
        onPlaying?.(false);
        resolve();
      });
    } else {
      URL.revokeObjectURL(url);
      onPlaying?.(false);
      resolve();
    }
  });
}

export async function speakWithOpenAI(
  text: string,
  language: Language,
  onPlaying?: (playing: boolean) => void,
): Promise<void> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (!res.ok) throw new Error(`TTS error: ${res.status}`);

  const blob = await res.blob();

  const ctx = getAudioContext();
  if (ctx) {
    const arrayBuffer = await blob.arrayBuffer();
    try {
      await playWithAudioContext(ctx, arrayBuffer, onPlaying);
      return;
    } catch {
      // AudioContext playback failed, fall through to HTMLAudioElement
    }
  }

  // Fallback: HTMLAudioElement for browsers without AudioContext
  const url = URL.createObjectURL(blob);
  await playWithAudioElement(url, onPlaying);
}

export function speak(
  text: string,
  language: Language,
  onPlaying?: (playing: boolean) => void,
): Promise<void> {
  window.speechSynthesis.cancel();
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_BCP47[language];

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(LANG_BCP47[language].slice(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;

    onPlaying?.(true);
    utterance.onend = () => {
      onPlaying?.(false);
      resolve();
    };
    utterance.onerror = () => {
      onPlaying?.(false);
      reject(new Error("Speech synthesis failed"));
    };

    window.speechSynthesis.speak(utterance);
  });
}
