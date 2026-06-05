import { AudioPlayer } from "@/components/AudioPlayer";
import type { Message } from "@/types";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/speech", () => ({
  isTTSSupported: vi.fn().mockReturnValue(true),
  speak: vi.fn().mockResolvedValue(undefined),
}));

import { isTTSSupported, speak } from "@/lib/speech";

const makeMsg = (id: string, role: "user" | "assistant", content: string): Message => ({
  id,
  role,
  content,
});

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.mocked(isTTSSupported).mockReturnValue(true);
    vi.mocked(speak).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing (invisible component)", async () => {
    let container!: HTMLElement;
    await act(async () => {
      const result = render(<AudioPlayer messages={[]} language="en" />);
      container = result.container;
    });
    expect(container.firstChild).toBeNull();
  });

  it("calls speak when last message is from assistant", async () => {
    const messages = [makeMsg("1", "assistant", "Hej!")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="sv" />);
    });
    expect(speak).toHaveBeenCalledWith("Hej!", "sv");
  });

  it("does not call speak when last message is from user", async () => {
    const messages = [makeMsg("1", "user", "Hello")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" />);
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("does not call speak when TTS is not supported", async () => {
    vi.mocked(isTTSSupported).mockReturnValue(false);
    const messages = [makeMsg("1", "assistant", "Hello")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="en" />);
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("does not call speak when messages is empty", async () => {
    await act(async () => {
      render(<AudioPlayer messages={[]} language="en" />);
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("calls speak with correct language for Farsi", async () => {
    const messages = [makeMsg("1", "assistant", "سلام")];
    await act(async () => {
      render(<AudioPlayer messages={messages} language="fa" />);
    });
    expect(speak).toHaveBeenCalledWith("سلام", "fa");
  });
});
