import { render, fireEvent, waitFor } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import ToggleTheme from "@/components/ToggleTheme";
import React from "react";
import { ThemeMode } from "@/types/theme-mode";

// Mock out the window.themeMode context for testing ToggleTheme
const mockToggle = vi.fn(() => Promise.resolve(true));
const mockCurrent = vi.fn(() => Promise.resolve("dark" as ThemeMode));
const mockDark = vi.fn();
const mockLight = vi.fn();
const mockSystem = vi.fn(() => Promise.resolve(true));

beforeEach(() => {
  window.themeMode = {
    current: mockCurrent,
    dark: mockDark,
    light: mockLight,
    system: mockSystem,
    toggle: mockToggle,
  };
});

test("renders ToggleTheme", () => {
  const { getByRole } = render(<ToggleTheme />);
  const button = getByRole("button");

  expect(button).toBeInTheDocument();
});

test("has icon", () => {
  const { getByRole } = render(<ToggleTheme />);
  const button = getByRole("button");
  const icon = button.querySelector("svg");

  expect(icon).toBeInTheDocument();
});

test("is moon icon by default", () => {
  const svgIconClassName: string = "lucide-moon";
  const { getByRole } = render(<ToggleTheme />);
  const svg = getByRole("button").querySelector("svg");

  expect(svg?.classList).toContain(svgIconClassName);
});

test("toggles theme on click", async () => {
  // Optionally, if your component changes the icon after toggling,
  // you may want to simulate a click and await state updates.
  const { getByRole } = render(<ToggleTheme />);
  const button = getByRole("button");

  fireEvent.click(button);
  expect(mockToggle).toHaveBeenCalled();

  // If your component changes the icon (for example, from moon to sun),
  // you might wait for the update and assert that.
  // For instance, suppose a sun icon appears after toggle:
  await waitFor(() => {
    const icon = button.querySelector("svg");
    // Replace "lucide-sun" with the expected sun icon class when theme is light.
    expect(icon?.classList).toContain("lucide-sun");
  });
});
