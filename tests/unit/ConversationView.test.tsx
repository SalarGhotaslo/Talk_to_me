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
    render(<ConversationView messages={[]} />);
    expect(screen.getByText(/select a language/i)).toBeInTheDocument();
  });

  it("renders user messages", () => {
    const messages = [makeMsg("1", "user", "Hello there")];
    render(<ConversationView messages={messages} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders assistant messages", () => {
    const messages = [makeMsg("1", "assistant", "Hi! How can I help?")];
    render(<ConversationView messages={messages} />);
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("renders multiple messages", () => {
    const messages = [makeMsg("1", "user", "Hej!"), makeMsg("2", "assistant", "Hej! Hur mår du?")];
    render(<ConversationView messages={messages} />);
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
    render(<ConversationView messages={messages} />);
    expect(screen.getByText(/Use 'well' instead of 'good'/)).toBeInTheDocument();
    expect(screen.getByText("Correction:")).toBeInTheDocument();
  });

  it("does not render correction section when correction is absent", () => {
    const messages = [makeMsg("1", "assistant", "Great job!")];
    render(<ConversationView messages={messages} />);
    expect(screen.queryByText("Correction:")).not.toBeInTheDocument();
  });

  it("has aria-live region for screen readers", () => {
    const { container } = render(<ConversationView messages={[makeMsg("1", "user", "Hi")]} />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toBeInTheDocument();
  });

  it("placeholder region has aria-live", () => {
    const { container } = render(<ConversationView messages={[]} />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toBeInTheDocument();
  });
});
