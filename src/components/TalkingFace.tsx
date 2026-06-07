"use client";

type Props = {
  isSpeaking: boolean;
};

export function TalkingFace({ isSpeaking }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      className="size-9 shrink-0"
      role="img"
      aria-label={isSpeaking ? "Tutor is speaking" : "Tutor avatar"}
    >
      <circle cx="40" cy="40" r="40" fill="#e0e7ff" />
      <circle cx="40" cy="40" r="38" fill="#eef2ff" stroke="#a5b4fc" strokeWidth="1.5" />

      {/* Eyes */}
      <circle cx="30" cy="34" r="3" fill="#4338ca" />
      <circle cx="29" cy="33" r="1" fill="white" />
      <circle cx="50" cy="34" r="3" fill="#4338ca" />
      <circle cx="49" cy="33" r="1" fill="white" />

      {/* Small smile / mouth */}
      {isSpeaking ? (
        <ellipse cx="40" cy="50" rx="8" ry="3.5" fill="#4338ca" className="origin-center">
          <animate
            attributeName="ry"
            values="3.5;7;4;6;3.5;6.5;4;7;3.5"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </ellipse>
      ) : (
        <path
          d="M 34 48 Q 40 44 46 48"
          fill="none"
          stroke="#4338ca"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
