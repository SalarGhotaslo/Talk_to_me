import { buildSystemPrompt } from "@/lib/prompts";
import type { Language } from "@/types";
import { describe, expect, it } from "vitest";

describe("buildSystemPrompt", () => {
  const languages: Language[] = ["en", "sv", "fa", "es"];

  it.each(languages)("returns a non-empty string for language %s", (lang) => {
    const prompt = buildSystemPrompt(lang);
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
  });

  it("includes English in the English prompt", () => {
    expect(buildSystemPrompt("en").toLowerCase()).toContain("english");
  });

  it("includes Swedish in the Swedish prompt", () => {
    expect(buildSystemPrompt("sv").toLowerCase()).toContain("swedish");
  });

  it("includes Farsi/Persian in the Farsi prompt", () => {
    const prompt = buildSystemPrompt("fa").toLowerCase();
    expect(prompt.includes("farsi") || prompt.includes("persian")).toBe(true);
  });

  it("includes Spanish in the Spanish prompt", () => {
    expect(buildSystemPrompt("es").toLowerCase()).toContain("spanish");
  });

  it("instructs the AI to respond in the target language", () => {
    expect(buildSystemPrompt("sv").toLowerCase()).toContain("swedish");
    expect(buildSystemPrompt("sv")).toMatch(/respond|reply|speak/i);
  });

  it("instructs the AI to correct mistakes naturally", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toMatch(/correct|correction|mistakes|errors/i);
  });

  it("instructs the AI to be encouraging", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toMatch(/encourage|supportive|positive|motivat/i);
  });

  it("produces different prompts for different languages", () => {
    const prompts = languages.map(buildSystemPrompt);
    const unique = new Set(prompts);
    expect(unique.size).toBe(languages.length);
  });
});
