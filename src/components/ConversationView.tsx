"use client";

import type { Message } from "@/types";
import { useEffect, useRef } from "react";

type Props = {
  messages: Message[];
};

export function ConversationView({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages prop change triggers scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <output aria-live="polite" className="flex flex-1 items-center justify-center text-gray-400">
        <p>Select a language and press the microphone to start speaking.</p>
      </output>
    );
  }

  return (
    <ol
      aria-label="Conversation history"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
    >
      {messages.map((message) => (
        <li
          key={message.id}
          className={[
            "max-w-prose rounded-2xl px-4 py-3 text-sm leading-relaxed",
            message.role === "user"
              ? "ml-auto bg-indigo-600 text-white"
              : "mr-auto bg-white text-gray-900 shadow-sm ring-1 ring-gray-200",
          ].join(" ")}
        >
          <p>{message.content}</p>
          {message.correction && (
            <aside
              aria-label="Correction"
              className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500"
            >
              <span className="font-medium">Correction: </span>
              {message.correction}
            </aside>
          )}
        </li>
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </ol>
  );
}
