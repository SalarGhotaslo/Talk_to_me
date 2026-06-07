"use client";

import { isTTSSupported, speak, speakWithOpenAI } from "@/lib/speech";
import type { Language, Message } from "@/types";
import { useEffect, useRef } from "react";

type Props = {
  messages: Message[];
  language: Language;
  isStreaming: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
};

export function AudioPlayer({ messages, language, isStreaming, onSpeakingChange }: Props) {
  const lastSpokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isStreaming) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (!lastMessage.content) return;
    if (lastSpokenIdRef.current === lastMessage.id) return;

    lastSpokenIdRef.current = lastMessage.id;

    speakWithOpenAI(lastMessage.content, language, onSpeakingChange).catch(() => {
      if (isTTSSupported()) {
        speak(lastMessage.content, language, onSpeakingChange).catch(() => {});
      } else {
        onSpeakingChange?.(false);
      }
    });
  }, [isStreaming, messages, language, onSpeakingChange]);

  return null;
}
