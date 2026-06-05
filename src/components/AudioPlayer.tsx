"use client";

import { isTTSSupported, speak } from "@/lib/speech";
import type { Language, Message } from "@/types";
import { useEffect } from "react";

type Props = {
  messages: Message[];
  language: Language;
};

export function AudioPlayer({ messages, language }: Props) {
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (!isTTSSupported()) return;

    speak(lastMessage.content, language).catch(() => {
      // TTS failure is non-fatal — user can still read the text
    });
  }, [lastMessage, language]);

  return null;
}
