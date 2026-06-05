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
];

export function LanguageSelector({ value, onChange, disabled = false }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-700">
        Language
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        disabled={disabled}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
