import { TalkingFace } from "@/components/TalkingFace";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("TalkingFace", () => {
  it("renders an SVG with tutor avatar label when not speaking", () => {
    const { container } = render(<TalkingFace isSpeaking={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByLabelText("Tutor avatar")).toBeInTheDocument();
  });

  it("renders with tutor speaking label when speaking", () => {
    render(<TalkingFace isSpeaking={true} />);
    expect(screen.getByLabelText("Tutor is speaking")).toBeInTheDocument();
  });

  it("renders a mouth path when not speaking", () => {
    const { container } = render(<TalkingFace isSpeaking={false} />);
    expect(container.querySelector("path")).toBeInTheDocument();
  });

  it("renders an animated mouth ellipse when speaking", () => {
    const { container } = render(<TalkingFace isSpeaking={true} />);
    expect(container.querySelector("ellipse")).toBeInTheDocument();
    expect(container.querySelector("animate")).toBeInTheDocument();
  });

  it("renders two eyes", () => {
    const { container } = render(<TalkingFace isSpeaking={false} />);
    const circles = container.querySelectorAll("svg > circle");
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});
