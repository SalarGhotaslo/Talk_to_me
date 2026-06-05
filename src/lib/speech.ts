import type { Language } from "@/types";

const LANG_BCP47: Record<Language, string> = {
  en: "en-US",
  sv: "sv-SE",
  fa: "fa-IR",
  es: "es-ES",
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

export function startListening(
  language: Language,
  onResult: (transcript: string) => void,
  onEnd: () => void,
): () => void {
  const w = window as WindowWithSpeech;
  const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    onEnd();
    return () => {};
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = LANG_BCP47[language];
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[event.resultIndex];
    const transcript = result?.[0]?.transcript ?? "";
    if (transcript) onResult(transcript);
  };

  recognition.onend = onEnd;

  recognition.onerror = () => {
    onEnd();
  };

  recognition.start();

  return () => recognition.stop();
}

export function speak(text: string, language: Language): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_BCP47[language];

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(LANG_BCP47[language].slice(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed"));

    window.speechSynthesis.speak(utterance);
  });
}
