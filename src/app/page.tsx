"use client";

import { AudioPlayer } from "@/components/AudioPlayer";
import { ConversationView } from "@/components/ConversationView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { isSTTSupported, isTTSSupported, startListening } from "@/lib/speech";
import type { ConversationState, Language, Message } from "@/types";
import { useCallback, useState } from "react";

const INITIAL_STATE: ConversationState = {
  messages: [],
  language: "en",
  recordingState: "idle",
};

export default function HomePage() {
  const [state, setState] = useState<ConversationState>(INITIAL_STATE);
  const [stopListening, setStopListening] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sttSupported = isSTTSupported();
  const ttsSupported = isTTSSupported();
  const browserSupported = sttSupported;

  const handleLanguageChange = useCallback((language: Language) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  const sendMessage = useCallback(
    async (transcript: string) => {
      setError(null);
      setState((prev) => ({
        ...prev,
        recordingState: "processing",
        messages: [
          ...prev.messages,
          { id: crypto.randomUUID(), role: "user", content: transcript },
        ],
      }));

      setState((prev) => {
        const nextMessages: Message[] = [
          ...prev.messages,
          { id: crypto.randomUUID(), role: "assistant", content: "" },
        ];

        streamResponse(nextMessages, prev.language);
        return { ...prev, messages: nextMessages };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const streamResponse = async (messages: Message[], language: Language) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter((m) => m.content !== ""),
          language,
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
          error: string;
        };
        throw new Error(data.error ?? "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.content) {
              setState((prev) => {
                const msgs = [...prev.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + parsed.content,
                  };
                }
                return { ...prev, messages: msgs };
              });
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.content !== ""),
      }));
    } finally {
      setState((prev) => ({ ...prev, recordingState: "idle" }));
    }
  };

  const handleToggleRecording = useCallback(() => {
    setState((prev) => {
      if (prev.recordingState === "recording") {
        stopListening?.();
        setStopListening(null);
        return { ...prev, recordingState: "idle" };
      }

      if (prev.recordingState === "idle") {
        const stop = startListening(
          prev.language,
          (transcript) => {
            setStopListening(null);
            sendMessage(transcript);
          },
          () => {
            setStopListening(null);
            setState((s) =>
              s.recordingState === "recording" ? { ...s, recordingState: "idle" } : s,
            );
          },
        );
        setStopListening(() => stop);
        return { ...prev, recordingState: "recording" };
      }

      return prev;
    });
  }, [stopListening, sendMessage]);

  if (!browserSupported) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div role="alert" className="max-w-md rounded-2xl bg-amber-50 p-8 ring-1 ring-amber-200">
          <h1 className="mb-3 text-xl font-semibold text-amber-900">Browser Not Supported</h1>
          <p className="text-amber-800">
            Talk To Me requires the Web Speech API for voice input. Please open this app in{" "}
            <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Talk To Me</h1>
        <LanguageSelector
          value={state.language}
          onChange={handleLanguageChange}
          disabled={state.recordingState !== "idle"}
        />
      </header>

      <section aria-label="Conversation" className="flex flex-1 flex-col overflow-hidden">
        <ConversationView messages={state.messages} />
      </section>

      {!ttsSupported && (
        <output className="px-6 py-2 text-center text-xs text-amber-600">
          Voice output is not available in this browser.
        </output>
      )}

      {error && (
        <p role="alert" className="px-6 py-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      <footer className="flex items-center justify-center border-t border-gray-200 bg-white px-6 py-6">
        <VoiceRecorder state={state.recordingState} onToggle={handleToggleRecording} />
      </footer>

      <AudioPlayer messages={state.messages} language={state.language} />
    </main>
  );
}
