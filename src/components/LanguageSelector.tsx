"use client";

import type { Language } from "@/types";

type Props = {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
};

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "sv", label: "Swedish" },
  { value: "fa", label: "Farsi" },
  { value: "es", label: "Spanish" },
  { value: "tr", label: "Turkish" },
  { value: "fr", label: "French" },
  { value: "nl", label: "Dutch" },
];

export function LanguageSelector({ value, onChange, disabled = false }: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        disabled={disabled}
        aria-label="Language"
        className={[
          "appearance-none rounded-lg border px-3 py-1.5 pr-7 text-sm font-medium shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500",
        ].join(" ")}
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none -ml-6 h-4 w-4 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
