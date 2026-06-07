export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "responding"
  | "disconnected"
  | "error";

export type RealtimeCallbacks = {
  onUserTranscript: (text: string) => void;
  onAssistantDelta: (delta: string) => void;
  onStatusChange: (status: RealtimeStatus) => void;
  onError: (error: string) => void;
};

type SessionConfig = {
  voice: string;
  language: string;
};

export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const sample = float32[i] ?? 0;
    const s = Math.max(-1, Math.min(1, sample));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16;
}

export function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = (int16[i] ?? 0) / 32768;
  }
  return float32;
}

export function base64Encode(buffer: ArrayBufferLike): string {
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i] ?? 0);
  }
  return btoa(binary);
}

export function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function isRealtimeSupported(): boolean {
  if (typeof window === "undefined") return false;
  const hasMicAccess = typeof navigator.mediaDevices?.getUserMedia === "function";
  const hasAudioContext = typeof AudioContext !== "undefined";
  return hasMicAccess && hasAudioContext;
}

export class RealtimeSession {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private callbacks: RealtimeCallbacks;
  private config: SessionConfig;
  private playQueue: string[] = [];
  private isPlaying = false;
  private accumulatedUserTranscript = "";
  private accumulatedAssistantTranscript = "";
  private lastUserTranscript = "";
  private active = false;

  constructor(callbacks: RealtimeCallbacks, config: SessionConfig) {
    this.callbacks = callbacks;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.callbacks.onStatusChange("connecting");

    try {
      const token = await this.fetchToken();

      if (!this.active) return;

      await this.connectWebSocket(token);
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err.message : "Failed to start session");
      this.callbacks.onStatusChange("error");
      this.cleanup();
    }
  }

  stop(): void {
    this.active = false;
    this.cleanup();
    this.callbacks.onStatusChange("idle");
  }

  private async fetchToken(): Promise<string> {
    const res = await fetch("/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice: this.config.voice,
        language: this.config.language,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Token request failed (${res.status})`);
    }

    const data = (await res.json()) as { ephemeral_key: string };
    return data.ephemeral_key;
  }

  private connectWebSocket(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket("wss://api.openai.com/v1/realtime", [
        "realtime",
        `openai-insecure-api-session.sess-${token}`,
      ]);

      this.ws.onopen = () => {
        if (!this.active) {
          this.ws?.close();
          return;
        }
        this.callbacks.onStatusChange("connected");

        this.ws?.send(
          JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              voice: this.config.voice,
              instructions: `You are a friendly and encouraging language tutor having a natural conversation with a learner. Respond exclusively in the learner's target language. Keep responses concise (2-4 sentences).`,
              input_audio_transcription: { enabled: true },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          }),
        );
      };

      this.ws.onerror = () => {
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = (event: CloseEvent) => {
        if (event.code !== 1000 && this.active) {
          this.callbacks.onError(`Connection closed (${event.code})`);
          this.callbacks.onStatusChange("error");
        }
        reject(new Error("WebSocket closed before session update"));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as { type: string };
          if (data.type === "session.created") {
            resolve();
            if (this.ws) {
              this.ws.onmessage = (e: MessageEvent) => this.handleMessage(e.data);
            }
            this.startRecording();
            this.callbacks.onStatusChange("listening");
          } else if (data.type === "error") {
            reject(new Error("Session creation failed"));
          }
        } catch {
          // ignore parse errors during setup
        }
      };
    });
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as {
        type: string;
        delta?: string;
        transcript?: string;
        item?: { role?: string };
        error?: { message?: string };
      };

      switch (event.type) {
        case "session.updated":
          break;

        case "input_audio_buffer.speech_started":
          this.accumulatedUserTranscript = "";
          this.callbacks.onStatusChange("listening");
          break;

        case "input_audio_buffer.speech_stopped":
          this.callbacks.onStatusChange("responding");
          this.accumulatedAssistantTranscript = "";
          break;

        case "conversation.item.created":
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript) {
            this.accumulatedUserTranscript += event.transcript;
          }
          break;

        case "response.audio_transcript.delta":
          if (event.delta) {
            this.accumulatedAssistantTranscript += event.delta;
            this.callbacks.onAssistantDelta(event.delta);
          }
          break;

        case "response.audio.delta":
          if (event.delta) {
            this.enqueueAudio(event.delta);
          }
          break;

        case "response.done":
          if (
            this.accumulatedUserTranscript &&
            this.accumulatedUserTranscript !== this.lastUserTranscript
          ) {
            this.lastUserTranscript = this.accumulatedUserTranscript;
            this.callbacks.onUserTranscript(this.accumulatedUserTranscript);
          }
          this.accumulatedAssistantTranscript = "";
          this.callbacks.onStatusChange("listening");
          break;

        case "error":
          this.callbacks.onError(event.error?.message ?? "Realtime API error");
          break;
      }
    } catch {
      // skip malformed events
    }
  }

  private async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!this.active) {
        this.stopMediaStream();
        return;
      }

      this.audioContext = new AudioContext();
      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      const sampleRate = this.audioContext.sampleRate;

      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (procEvent: AudioProcessingEvent) => {
        if (!this.active || this.ws?.readyState !== WebSocket.OPEN) return;

        const input = procEvent.inputBuffer.getChannelData(0);

        let samples = input;

        if (sampleRate !== 24000) {
          const ratio = sampleRate / 24000;
          const resampledLength = Math.floor(input.length / ratio);
          const resampled = new Float32Array(resampledLength);
          for (let i = 0; i < resampledLength; i++) {
            const idx = Math.floor(i * ratio);
            const sample = idx < input.length ? (input[idx] ?? 0) : 0;
            resampled[i] = sample;
          }
          samples = resampled;
        }

        const int16 = float32ToInt16(samples);
        const base64 = base64Encode(int16.buffer);

        this.ws?.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64,
          }),
        );
      };

      this.audioSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err.message : "Microphone access denied");
      this.callbacks.onStatusChange("error");
    }
  }

  private enqueueAudio(base64Data: string): void {
    this.playQueue.push(base64Data);
    if (!this.isPlaying) this.processPlayQueue();
  }

  private processPlayQueue(): void {
    if (this.playQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const base64 = this.playQueue.shift();
    if (!base64) {
      this.isPlaying = false;
      return;
    }

    try {
      const int16 = base64ToInt16(base64);
      const float32 = int16ToFloat32(int16);

      const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.onended = () => this.processPlayQueue();
      source.start();
    } catch {
      this.processPlayQueue();
    }
  }

  private stopMediaStream(): void {
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
  }

  private cleanup(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    this.stopMediaStream();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.playQueue = [];
    this.isPlaying = false;
    this.accumulatedUserTranscript = "";
    this.accumulatedAssistantTranscript = "";
  }
}
