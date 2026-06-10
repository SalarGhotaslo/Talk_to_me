"use client";

import { ConversationView } from "@/components/ConversationView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { speakWithOpenAI, unlockAudio } from "@/lib/speech";
import type { Language, Message, Topic } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

type ConversationState = {
  messages: Message[];
  language: Language;
  recordingState: "idle" | "recording" | "processing";
  topic: Topic;
};

const INITIAL_STATE: ConversationState = {
  messages: [],
  language: "en",
  recordingState: "idle",
  topic: "free",
};

const TOPICS: Array<{ value: Topic; label: string }> = [
  { value: "free", label: "Free" },
  { value: "restaurant", label: "Restaurant" },
  { value: "travel", label: "Travel" },
  { value: "shopping", label: "Shopping" },
  { value: "business", label: "Business" },
  { value: "introductions", label: "Introductions" },
  { value: "hobbies", label: "Hobbies" },
];

export default function Home() {
  const [state, setState] = useState<ConversationState>(INITIAL_STATE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dark, setDark] = useState(false);
  const [typedText, setTypedText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dark");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored !== null ? stored === "true" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldBeDark);
    setDark(shouldBeDark);
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("dark", String(next));
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        recordingState: "processing",
      }));

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...state.messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            language: state.language,
            topic: state.topic,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        let assistantContent = "";
        const assistantId = crypto.randomUUID();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              assistantContent += parsed.content;

              setState((prev) => {
                const existing = prev.messages.find((m) => m.id === assistantId);
                if (existing) {
                  return {
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m,
                    ),
                  };
                }
                return {
                  ...prev,
                  messages: [
                    ...prev.messages,
                    { id: assistantId, role: "assistant", content: assistantContent },
                  ],
                };
              });
            } catch {
              /* skip malformed chunks */
            }
          }
        }

        await speakWithOpenAI(assistantContent, state.language, setIsSpeaking);
      } catch {
        // timeout or abort — not an error
      } finally {
        setState((prev) => ({ ...prev, recordingState: "idle" }));
      }
    },
    [state.messages, state.language, state.topic],
  );

  const handleRecordingToggle = useCallback(() => {
    unlockAudio();
    if (state.recordingState === "recording") {
      recognitionRef.current?.stop();
      setState((prev) => ({ ...prev, recordingState: "idle" }));
      return;
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not available in this browser.");
      return;
    }

    const SpeechRecognitionCtor: new () => SpeechRecognition = (
      "SpeechRecognition" in window
        ? // biome-ignore lint/complexity/useLiteralKeys: browser API access with dynamic key
          (window as Record<string, unknown>)["SpeechRecognition"]
        : // biome-ignore lint/complexity/useLiteralKeys: browser API access with dynamic key
          (window as Record<string, unknown>)["webkitSpeechRecognition"]
    ) as new () => SpeechRecognition;
    const recognition = new SpeechRecognitionCtor();

    const BCP47: Record<Language, string> = {
      en: "en-US",
      sv: "sv-SE",
      fa: "fa",
      es: "es-ES",
      tr: "tr-TR",
      fr: "fr-FR",
      nl: "nl-NL",
    };

    recognition.lang = BCP47[state.language];
    recognition.continuous = true;
    recognition.interimResults = true;

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let finalText = "";

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 2500);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) {
          const transcript = result[0]?.transcript;
          if (transcript) {
            finalText += `${transcript} `;
          }
          isFinal = true;
        } else {
          isFinal = true;
        }
      }
      if (isFinal) resetSilenceTimer();
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      const text = finalText.trim();
      finalText = "";
      if (text) {
        sendMessage(text);
      } else {
        setState((prev) => ({ ...prev, recordingState: "idle" }));
      }
    };

    recognition.onerror = () => {
      setState((prev) => ({ ...prev, recordingState: "idle" }));
    };

    try {
      recognition.start();
    } catch {
      setState((prev) => ({ ...prev, recordingState: "idle" }));
      return;
    }
    recognitionRef.current = recognition;
    setState((prev) => ({ ...prev, recordingState: "recording" }));
  }, [state.language, state.recordingState, sendMessage]);

  const handleTypedSend = useCallback(() => {
    unlockAudio();
    const text = typedText.trim();
    if (!text) return;
    setTypedText("");
    sendMessage(text);
  }, [typedText, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleTypedSend();
      }
    },
    [handleTypedSend],
  );

  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setTopicOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="mx-auto flex h-dvh max-w-[720px] flex-col overflow-hidden bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200/80 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Talk To Me</h1>
          <LanguageSelector
            value={state.language}
            onChange={(language) => setState((prev) => ({ ...prev, messages: [], language }))}
            disabled={state.recordingState !== "idle"}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={topicRef}>
            <button
              type="button"
              onClick={() => setTopicOpen((o) => !o)}
              aria-label="Select conversation topic"
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            >
              {TOPICS.find((t) => t.value === state.topic)?.label ?? "Topic"}
              <svg
                aria-hidden="true"
                className={`h-3 w-3 transition-transform ${topicOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {topicOpen && (
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {TOPICS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setState((prev) => ({ ...prev, topic: t.value }));
                      setTopicOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                      state.topic === t.value
                        ? "bg-[#007AFF]/10 font-medium text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleDark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            {dark ? (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Conversation */}
      <ConversationView messages={state.messages} isSpeaking={isSpeaking} />

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex items-end gap-3">
          {/* Typing input */}
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-gray-200 bg-gray-100 px-4 py-2 transition-all focus-within:border-[#007AFF] focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-[#0A84FF] dark:focus-within:bg-gray-800">
            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-200 dark:placeholder-gray-500"
            />
            {typedText.trim() && (
              <button
                type="button"
                onClick={handleTypedSend}
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white transition-all hover:bg-[#0066d6] active:scale-95 dark:bg-[#0A84FF] dark:hover:bg-[#0066d6]"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Mic */}
          <VoiceRecorder state={state.recordingState} onToggle={handleRecordingToggle} />
        </div>
      </footer>
    </div>
  );
}
