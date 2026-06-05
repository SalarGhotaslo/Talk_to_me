/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";

// jsdom doesn't implement scrollIntoView
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Suppress Next.js font/image warnings in tests
vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter" }),
}));
