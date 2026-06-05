import { LanguageSelector } from "@/components/LanguageSelector";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("LanguageSelector", () => {
  it("renders a labelled select element", () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  it("shows all four language options", () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Swedish" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Farsi" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Spanish" })).toBeInTheDocument();
  });

  it("reflects the current language value", () => {
    render(<LanguageSelector value="sv" onChange={vi.fn()} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("sv");
  });

  it("calls onChange with the selected language", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageSelector value="en" onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox"), "es");
    expect(onChange).toHaveBeenCalledWith("es");
  });

  it("is disabled when disabled prop is true", () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("is enabled by default", () => {
    render(<LanguageSelector value="en" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });
});
