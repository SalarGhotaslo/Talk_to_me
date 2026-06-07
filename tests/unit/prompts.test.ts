import { buildSystemPrompt } from "@/lib/prompts";
import type { Language } from "@/types";
import { describe, expect, it } from "vitest";

describe("buildSystemPrompt", () => {
  const languages: Language[] = ["en", "sv", "fa", "es", "tr", "fr", "nl"];

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

  it("includes Turkish in the Turkish prompt", () => {
    expect(buildSystemPrompt("tr").toLowerCase()).toContain("turkish");
  });

  it("includes French in the French prompt", () => {
    expect(buildSystemPrompt("fr").toLowerCase()).toContain("french");
  });

  it("includes Dutch in the Dutch prompt", () => {
    expect(buildSystemPrompt("nl").toLowerCase()).toContain("dutch");
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
    const prompts = languages.map((l) => buildSystemPrompt(l));
    const unique = new Set(prompts);
    expect(unique.size).toBe(languages.length);
  });

  it("includes restaurant vocabulary when topic is restaurant", () => {
    const prompt = buildSystemPrompt("en", "restaurant");
    expect(prompt).toMatch(/menu|order|bill|reservation|waitstaff/i);
  });

  it("includes travel vocabulary when topic is travel", () => {
    const prompt = buildSystemPrompt("en", "travel");
    expect(prompt).toMatch(/ticket|platform|check-in|directions|accommodation/i);
  });

  it("includes shopping vocabulary when topic is shopping", () => {
    const prompt = buildSystemPrompt("en", "shopping");
    expect(prompt).toMatch(/price|size|receipt|discount|fitting room/i);
  });

  it("includes introductions guidance when topic is introductions", () => {
    const prompt = buildSystemPrompt("en", "introductions");
    expect(prompt).toMatch(/introducing|introductions|meet|background/i);
  });

  it("includes hobbies vocabulary when topic is hobbies", () => {
    const prompt = buildSystemPrompt("en", "hobbies");
    expect(prompt).toMatch(/hobbies|interests|activities|pastimes|sports/i);
  });

  it("includes business vocabulary when topic is business", () => {
    const prompt = buildSystemPrompt("en", "business");
    expect(prompt).toMatch(/meeting|deadline|project|colleague|presentation/i);
  });

  it("defaults to free topic when no topic given", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toMatch(/natural|free-flowing|day|interests/i);
  });

  it("produces different prompts for different topics", () => {
    const topics: Array<import("@/types").Topic> = ["free", "restaurant", "travel", "shopping"];
    const prompts = topics.map((t) => buildSystemPrompt("en", t));
    const unique = new Set(prompts);
    expect(unique.size).toBe(topics.length);
  });
});
