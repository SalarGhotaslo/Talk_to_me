import { ConversationView } from "@/components/ConversationView";
import type { Message } from "@/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const makeMsg = (id: string, role: "user" | "assistant", content: string): Message => ({
  id,
  role,
  content,
});

describe("ConversationView", () => {
  it("shows placeholder when no messages", () => {
    render(<ConversationView messages={[]} isSpeaking={false} />);
    expect(screen.getByText(/press the microphone/i)).toBeInTheDocument();
  });

  it("renders user messages", () => {
    const messages = [makeMsg("1", "user", "Hello there")];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders assistant messages", () => {
    const messages = [makeMsg("1", "assistant", "Hi! How can I help?")];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("renders multiple messages", () => {
    const messages = [makeMsg("1", "user", "Hej!"), makeMsg("2", "assistant", "Hej! Hur mår du?")];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.getByText("Hej!")).toBeInTheDocument();
    expect(screen.getByText("Hej! Hur mår du?")).toBeInTheDocument();
  });

  it("renders correction when present", () => {
    const messages = [
      {
        id: "1",
        role: "assistant" as const,
        content: "Good!",
        correction: "Use 'well' instead of 'good'",
      },
    ];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.getByText(/Use 'well' instead of 'good'/)).toBeInTheDocument();
    expect(screen.getByText("Correction:")).toBeInTheDocument();
  });

  it("does not render correction section when correction is absent", () => {
    const messages = [makeMsg("1", "assistant", "Great job!")];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.queryByText("Correction:")).not.toBeInTheDocument();
  });

  it("applies animation class to last 3 messages", () => {
    const messages = [
      makeMsg("1", "user", "Hello"),
      makeMsg("2", "assistant", "Hi!"),
      makeMsg("3", "user", "How are you?"),
      makeMsg("4", "assistant", "I'm great!"),
    ];
    const { container } = render(<ConversationView messages={messages} isSpeaking={true} />);
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(4);
    items.forEach((item, idx) => {
      if (idx >= 4 - 3) {
        expect(item.className).toContain("animate-slide-up");
      }
    });
  });

  it("passes isSpeaking to the last assistant message's avatar", () => {
    const messages = [makeMsg("1", "user", "Hi"), makeMsg("2", "assistant", "Hello!")];
    const { container } = render(<ConversationView messages={messages} isSpeaking={true} />);
    const lastLi = container.querySelector("li:last-of-type");
    expect(lastLi).toBeInTheDocument();
    const avatar = lastLi?.querySelector('[aria-label="Tutor is speaking"]');
    expect(avatar).toBeInTheDocument();
  });

  it("passes isSpeaking=false to avatar when not speaking", () => {
    const messages = [makeMsg("1", "assistant", "Hello!")];
    render(<ConversationView messages={messages} isSpeaking={false} />);
    expect(screen.getByLabelText("Tutor avatar")).toBeInTheDocument();
  });

  it("has aria-live region for screen readers", () => {
    const { container } = render(
      <ConversationView messages={[makeMsg("1", "user", "Hi")]} isSpeaking={false} />,
    );
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toBeInTheDocument();
  });

  it("placeholder region has aria-live", () => {
    const { container } = render(<ConversationView messages={[]} isSpeaking={false} />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toBeInTheDocument();
  });

  it("has aria-relevant for accessible announcements", () => {
    const { container } = render(
      <ConversationView messages={[makeMsg("1", "user", "Hi")]} isSpeaking={false} />,
    );
    const liveRegion = container.querySelector("[aria-relevant='additions']");
    expect(liveRegion).toBeInTheDocument();
  });

  it("does not apply animation class to messages beyond the last 3", () => {
    const messages = [
      makeMsg("1", "user", "Hello"),
      makeMsg("2", "assistant", "Hi!"),
      makeMsg("3", "user", "How are you?"),
      makeMsg("4", "assistant", "I'm great!"),
      makeMsg("5", "user", "Nice"),
    ];
    const { container } = render(<ConversationView messages={messages} isSpeaking={false} />);
    const items = container.querySelectorAll("li");
    // First 2 items (index 0, 1) should NOT have animation class
    expect(items[0]?.className).not.toContain("animate-slide-up");
    expect(items[1]?.className).not.toContain("animate-slide-up");
    // Last 3 items (index 2, 3, 4) should have animation class
    expect(items[2]?.className).toContain("animate-slide-up");
    expect(items[3]?.className).toContain("animate-slide-up");
    expect(items[4]?.className).toContain("animate-slide-up");
  });
});
