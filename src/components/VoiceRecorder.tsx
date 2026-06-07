"use client";

import type { RecordingState } from "@/types";

type Props = {
  state: RecordingState;
  onToggle: () => void;
  disabled?: boolean;
};

const ARIA_LABELS: Record<RecordingState, string> = {
  idle: "Start recording",
  recording: "Stop recording",
  processing: "Processing your message",
};

export function VoiceRecorder({ state, onToggle, disabled = false }: Props) {
  const isDisabled = disabled || state === "processing";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      aria-label={ARIA_LABELS[state]}
      aria-pressed={state === "recording"}
      className={[
        "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#007AFF]/30 focus-visible:ring-offset-2",
        "shadow-md hover:shadow-lg active:scale-95",
        state === "idle" &&
          "bg-[#007AFF] hover:bg-[#0066d6] dark:bg-[#0A84FF] dark:hover:bg-[#0066d6]",
        state === "recording" &&
          "bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600",
        state === "processing" && "bg-gray-400 cursor-not-allowed dark:bg-gray-600",
        isDisabled && state !== "processing" && "opacity-50 cursor-not-allowed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {state === "idle" && (
        <svg
          aria-hidden="true"
          className="h-6 w-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM8 17.5a5.001 5.001 0 0 0 9.95-.5H20a8 8 0 0 1-7 7.93V23h-2v-2.07A8 8 0 0 1 4 13h2.05A5 5 0 0 0 8 17.5z" />
        </svg>
      )}
      {state === "recording" && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/60 dark:bg-red-400/60" />
          <svg
            aria-hidden="true"
            className="relative h-6 w-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </>
      )}
      {state === "processing" && (
        <svg
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
    </button>
  );
}
