import { render, fireEvent, act } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import ToggleTheme from "@/components/ToggleTheme";
import React from "react";
import { ThemeMode } from "@/types/theme-mode";

/**
 * Test suite for the ToggleTheme component
 *
 * This file tests that the ToggleTheme component renders correctly,
 * shows the appropriate icon based on theme state, and properly
 * toggles the theme when clicked.
 */

// Create mock functions for the themeMode context methods
let currentTheme: ThemeMode = "dark";
const mockToggle = vi.fn(() => {
  // Toggle the currentTheme mock state
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  return Promise.resolve(true);
});
const mockCurrent = vi.fn(() => Promise.resolve(currentTheme));
const mockDark = vi.fn();
const mockLight = vi.fn();
const mockSystem = vi.fn(() => Promise.resolve(true));

// Before each test, set up a fresh mock of the window.themeMode object
beforeEach(() => {
  // Reset mock theme state
  currentTheme = "dark";

  window.themeMode = {
    current: mockCurrent,
    dark: mockDark,
    light: mockLight,
    system: mockSystem,
    toggle: mockToggle,
  };

  // Reset mocks to get clean state for each test
  vi.clearAllMocks();
});

test("renders ToggleTheme", async () => {
  // Use act to wrap the component rendering that might cause state updates
  const result = await act(async () => {
    return render(<ToggleTheme />);
  });

  // Verify that the button is in the document
  const button = result.getByRole("button");
  expect(button).toBeInTheDocument();
});

test("has icon", async () => {
  // Use act to wrap the component rendering that might cause state updates
  const result = await act(async () => {
    return render(<ToggleTheme />);
  });

  const button = result.getByRole("button");

  // Find the SVG icon inside the button
  const icon = button.querySelector("svg");

  // Verify that the icon exists
  expect(icon).toBeInTheDocument();
});

test("is sun icon by default when theme is dark", async () => {
  // When theme is dark, we show the sun icon (to switch to light)
  const svgIconClassName: string = "lucide-sun";

  // Use act to wrap the component rendering that might cause state updates
  const result = await act(async () => {
    return render(<ToggleTheme />);
  });

  // Get the SVG element
  const svg = result.getByRole("button").querySelector("svg");

  // Verify that the SVG has the sun icon class
  expect(svg?.classList).toContain(svgIconClassName);
});

test("toggles theme icon on click", async () => {
  // Render the component wrapped in act
  const result = await act(async () => {
    return render(<ToggleTheme />);
  });

  const button = result.getByRole("button");

  // First, verify it shows the sun icon (for dark theme)
  const initialIcon = button.querySelector("svg");
  expect(initialIcon?.classList.contains("lucide-sun")).toBe(true);

  // Use act to wrap the click event that causes state updates
  await act(async () => {
    fireEvent.click(button);
  });

  // Verify that the toggle function was called
  expect(mockToggle).toHaveBeenCalled();

  // Manually re-render to simulate the component updating after state change
  await act(async () => {
    result.rerender(<ToggleTheme />);
  });

  // Now check the button icon has changed after the toggle and rerender
  const updatedIcon = button.querySelector("svg");
  expect(updatedIcon?.classList.contains("lucide-moon")).toBe(true);
});
