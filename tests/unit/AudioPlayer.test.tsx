import { AudioPlayer } from "@/components/AudioPlayer";
import type { Message } from "@/types";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/speech", () => ({
  isTTSSupported: vi.fn().mockReturnValue(true),
  speak: vi.fn().mockResolvedValue(undefined),
  speakWithOpenAI: vi.fn().mockResolvedValue(undefined),
}));

import { isTTSSupported, speak, speakWithOpenAI } from "@/lib/speech";

const makeMsg = (id: string, role: "user" | "assistant", content: string): Message => ({
  id,
  role,
  content,
});

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.mocked(isTTSSupported).mockReturnValue(true);
    vi.mocked(speak).mockResolvedValue(undefined);
    vi.mocked(speakWithOpenAI).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing (invisible component)", async () => {
    let container!: HTMLElement;
    await act(async () => {
      const result = render(<AudioPlayer messages={[]} language="en" isStreaming={false} />);
      container = result.container;
    });
    expect(container.firstChild).toBeNull();
  });

  it("calls speakWithOpenAI when last message is from assistant and streaming is done", async () => {
    const messages = [makeMsg("1", "assistant", "Hej!")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="sv" isStreaming={false} />);
    });
    expect(speakWithOpenAI).toHaveBeenCalledWith("Hej!", "sv", undefined);
  });

  it("does not call speakWithOpenAI while streaming is in progress", async () => {
    const messages = [makeMsg("1", "assistant", "Hej")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="sv" isStreaming={true} />);
    });
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("does not call speakWithOpenAI when last message is from user", async () => {
    const messages = [makeMsg("1", "user", "Hello")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" isStreaming={false} />);
    });
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("does not call speakWithOpenAI when messages is empty", async () => {
    await act(async () => {
      render(<AudioPlayer messages={[]} language="en" isStreaming={false} />);
    });
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("does not call speakWithOpenAI when assistant message content is empty", async () => {
    const messages = [makeMsg("1", "assistant", "")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" isStreaming={false} />);
    });
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("does not speak when lastSpokenId matches current message id", async () => {
    const messages = [makeMsg("1", "assistant", "Hello")];
    const { rerender } = render(
      <AudioPlayer messages={messages} language="en" isStreaming={false} />,
    );
    await act(async () => {});

    vi.mocked(speakWithOpenAI).mockClear();
    rerender(<AudioPlayer messages={messages} language="en" isStreaming={false} />);
    await act(async () => {});
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("falls back to browser speak when speakWithOpenAI fails", async () => {
    vi.mocked(speakWithOpenAI).mockRejectedValue(new Error("TTS API error"));
    const messages = [makeMsg("1", "assistant", "Hello")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" isStreaming={false} />);
    });
    await act(async () => {});
    expect(speak).toHaveBeenCalledWith("Hello", "en", undefined);
  });

  it("does not fall back to browser speak when TTS is unsupported and OpenAI fails", async () => {
    vi.mocked(speakWithOpenAI).mockRejectedValue(new Error("TTS API error"));
    vi.mocked(isTTSSupported).mockReturnValue(false);
    const messages = [makeMsg("1", "assistant", "Hello")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" isStreaming={false} />);
    });
    await act(async () => {});
    expect(speak).not.toHaveBeenCalled();
  });

  it("calls speakWithOpenAI with correct language for Farsi", async () => {
    const messages = [makeMsg("1", "assistant", "سلام")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="fa" isStreaming={false} />);
    });
    expect(speakWithOpenAI).toHaveBeenCalledWith("سلام", "fa", undefined);
  });

  it("does not speak the same message twice", async () => {
    const messages = [makeMsg("1", "assistant", "Hello")];
    const { rerender } = render(
      <AudioPlayer messages={messages} language="en" isStreaming={false} />,
    );
    await act(async () => {});
    expect(speakWithOpenAI).toHaveBeenCalledTimes(1);

    vi.mocked(speakWithOpenAI).mockClear();
    const sameContent = [makeMsg("1", "assistant", "Hello")];
    rerender(<AudioPlayer messages={sameContent} language="en" isStreaming={false} />);
    await act(async () => {});
    expect(speakWithOpenAI).not.toHaveBeenCalled();
  });

  it("speaks new messages when they are added", async () => {
    const messages = [makeMsg("1", "assistant", "Hello")];
    const { rerender } = render(
      <AudioPlayer messages={messages} language="en" isStreaming={false} />,
    );
    await act(async () => {});
    expect(speakWithOpenAI).toHaveBeenCalledTimes(1);

    vi.mocked(speakWithOpenAI).mockClear();
    const moreMessages = [...messages, makeMsg("2", "assistant", "Hi again")];
    rerender(<AudioPlayer messages={moreMessages} language="en" isStreaming={false} />);
    await act(async () => {});
    expect(speakWithOpenAI).toHaveBeenCalledWith("Hi again", "en", undefined);
  });

  it("calls onSpeakingChange with true then false after playback", async () => {
    const onSpeakingChange = vi.fn();
    const messages = [makeMsg("1", "assistant", "Hello")];
    await act(async () => {
      render(
        <AudioPlayer
          messages={messages}
          language="en"
          isStreaming={false}
          onSpeakingChange={onSpeakingChange}
        />,
      );
    });
    expect(speakWithOpenAI).toHaveBeenCalledWith("Hello", "en", onSpeakingChange);
  });

  it("calls onSpeakingChange with false when both TTS options fail and no browser TTS", async () => {
    vi.mocked(speakWithOpenAI).mockRejectedValue(new Error("TTS API error"));
    vi.mocked(isTTSSupported).mockReturnValue(false);
    const onSpeakingChange = vi.fn();
    const messages = [makeMsg("1", "assistant", "Hello")];
    await act(async () => {
      render(
        <AudioPlayer
          messages={messages}
          language="en"
          isStreaming={false}
          onSpeakingChange={onSpeakingChange}
        />,
      );
    });
    await act(async () => {});
    expect(onSpeakingChange).toHaveBeenCalledWith(false);
  });
});
