import { VoiceRecorder } from "@/components/VoiceRecorder";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("VoiceRecorder", () => {
  it("has aria-label 'Start recording' when idle", () => {
    render(<VoiceRecorder state="idle" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });

  it("has aria-label 'Stop recording' when recording", () => {
    render(<VoiceRecorder state="recording" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument();
  });

  it("has aria-label 'Processing your message' when processing", () => {
    render(<VoiceRecorder state="processing" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Processing your message" })).toBeInTheDocument();
  });

  it("is pressed when recording", () => {
    render(<VoiceRecorder state="recording" onToggle={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("is not pressed when idle", () => {
    render(<VoiceRecorder state="idle" onToggle={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("is disabled when processing", () => {
    render(<VoiceRecorder state="processing" onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onToggle when clicked from idle state", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<VoiceRecorder state="idle" onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("calls onToggle when clicked from recording state", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<VoiceRecorder state="recording" onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("does not call onToggle when clicked in processing state", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<VoiceRecorder state="processing" onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("is keyboard accessible — Space triggers onToggle from idle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<VoiceRecorder state="idle" onToggle={onToggle} />);
    screen.getByRole("button").focus();
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
