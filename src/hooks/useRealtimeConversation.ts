"use client";

import { type RealtimeSession, type RealtimeStatus, isRealtimeSupported } from "@/lib/realtime";
import type { Language } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

type UseRealtimeConversationOptions = {
  language: Language;
  voice: string;
  onUserMessage: (text: string) => void;
  onAssistantDelta: (delta: string) => void;
  onError: (error: string) => void;
};

type UseRealtimeConversationReturn = {
  start: () => Promise<void>;
  stop: () => void;
  status: RealtimeStatus;
  isSupported: boolean;
};

export function useRealtimeConversation({
  language,
  voice,
  onUserMessage,
  onAssistantDelta,
  onError,
}: UseRealtimeConversationOptions): UseRealtimeConversationReturn {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [supported, setSupported] = useState(false);

  const handleStatusChange = useCallback((s: RealtimeStatus) => {
    setStatus(s);
  }, []);

  const handleError = useCallback(
    (error: string) => {
      onError(error);
    },
    [onError],
  );

  useEffect(() => {
    setSupported(isRealtimeSupported());
  }, []);

  const start = useCallback(async () => {
    const { RealtimeSession: SessionClass } = await import("@/lib/realtime");

    const session = new SessionClass(
      {
        onUserTranscript: onUserMessage,
        onAssistantDelta,
        onStatusChange: handleStatusChange,
        onError: handleError,
      },
      { voice, language },
    );

    sessionRef.current = session;
    await session.start();
  }, [voice, language, onUserMessage, onAssistantDelta, handleStatusChange, handleError]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  return {
    start,
    stop,
    status,
    isSupported: supported,
  };
}
