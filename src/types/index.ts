export type Language = "en" | "sv" | "fa" | "es";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  correction?: string;
};

export type RecordingState = "idle" | "recording" | "processing";

export type ConversationState = {
  messages: Message[];
  language: Language;
  recordingState: RecordingState;
};

export type OpenRouterError = {
  code: "unauthorized" | "rate_limited" | "network_error" | "api_error";
  message: string;
};
