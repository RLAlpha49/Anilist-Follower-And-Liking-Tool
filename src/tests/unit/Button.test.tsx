import { render, fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";
import React from "react";

/**
 * Test suite for the Button component
 *
 * This file tests that the Button UI component renders correctly with different variants and sizes,
 * responds to click events, and handles the disabled state appropriately.
 */

test("renders Button with default variant", () => {
  // Render a button with default props
  const { getByRole } = render(<Button>Click me</Button>);
  const button = getByRole("button");

  // Verify the button is in the document and has the correct text
  expect(button).toBeInTheDocument();
  expect(button).toHaveTextContent("Click me");

  // Check that the default variant has the primary background class
  expect(button.className).toContain("bg-primary");
});

// Test each variant separately instead of using a loop
test("renders Button with default variant correctly", () => {
  const { getByRole } = render(<Button variant="default">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("bg-primary");
});

test("renders Button with destructive variant correctly", () => {
  const { getByRole } = render(<Button variant="destructive">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("bg-destructive");
});

test("renders Button with outline variant correctly", () => {
  const { getByRole } = render(<Button variant="outline">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("border-input");
});

test("renders Button with secondary variant correctly", () => {
  const { getByRole } = render(<Button variant="secondary">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("bg-secondary");
});

test("renders Button with ghost variant correctly", () => {
  const { getByRole } = render(<Button variant="ghost">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("hover:bg-accent");
});

test("renders Button with link variant correctly", () => {
  const { getByRole } = render(<Button variant="link">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("underline-offset-4");
});

// Test each size separately instead of using a loop
test("renders Button with default size correctly", () => {
  const { getByRole } = render(<Button size="default">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("h-10 px-4");
});

test("renders Button with small size correctly", () => {
  const { getByRole } = render(<Button size="sm">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("h-9");
});

test("renders Button with large size correctly", () => {
  const { getByRole } = render(<Button size="lg">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("h-11");
});

test("renders Button with icon size correctly", () => {
  const { getByRole } = render(<Button size="icon">Button</Button>);
  const button = getByRole("button");
  expect(button.className).toContain("h-10 w-10");
});

test("calls onClick handler when clicked", () => {
  // Create a mock function to use as the click handler
  const handleClick = vi.fn();

  // Render the button with the mock click handler
  const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
  const button = getByRole("button");

  // Simulate a click on the button
  fireEvent.click(button);

  // Verify that the click handler was called exactly once
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("renders as disabled when disabled prop is true", () => {
  // Render the button with the disabled prop
  const { getByRole } = render(<Button disabled>Disabled</Button>);
  const button = getByRole("button");

  // Check that the button has the disabled attribute
  expect(button).toBeDisabled();

  // Check that it has the appropriate CSS class for the disabled state
  expect(button.className).toContain("disabled:opacity-50");
});
