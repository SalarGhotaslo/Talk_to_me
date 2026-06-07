"use client";

import { TalkingFace } from "@/components/TalkingFace";
import type { Message } from "@/types";
import { useEffect, useRef } from "react";

type Props = {
  messages: Message[];
  isSpeaking: boolean;
};

export function ConversationView({ messages, isSpeaking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <output aria-live="polite" className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <TalkingFace isSpeaking={false} />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Press the microphone or type a message
          </p>
        </div>
      </output>
    );
  }

  return (
    <ol
      aria-label="Conversation history"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
    >
      {messages.map((message, i) =>
        message.role === "user" ? (
          <li
            key={message.id}
            className={[
              "ml-auto max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              "bg-[#007AFF] text-white dark:bg-[#0A84FF]",
              i >= messages.length - 3 ? "animate-slide-up" : "",
            ].join(" ")}
          >
            <p>{message.content}</p>
          </li>
        ) : (
          <li
            key={message.id}
            className={[
              "flex items-end gap-2",
              i >= messages.length - 3 ? "animate-slide-up" : "",
            ].join(" ")}
            style={{ animationDelay: `${(messages.length - 1 - i) * 50}ms` } as React.CSSProperties}
          >
            <TalkingFace isSpeaking={i === messages.length - 1 ? isSpeaking : false} />
            <div
              className={[
                "max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                "bg-[#E9E9EB] text-gray-800 dark:bg-[#2C2C2E] dark:text-gray-200",
              ].join(" ")}
            >
              <p>{message.content}</p>
              {message.correction && (
                <aside
                  aria-label="Correction"
                  className="mt-1.5 border-t border-gray-300/50 pt-1.5 text-xs text-gray-500 dark:border-gray-600/50 dark:text-gray-400"
                >
                  <span className="font-medium text-[#007AFF] dark:text-[#0A84FF]">
                    Correction:{" "}
                  </span>
                  {message.correction}
                </aside>
              )}
            </div>
          </li>
        ),
      )}
      <div ref={bottomRef} aria-hidden="true" />
    </ol>
  );
}
