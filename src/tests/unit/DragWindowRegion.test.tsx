import { render, fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import DragWindowRegion from "@/components/DragWindowRegion";
import React from "react";

/**
 * Test suite for the DragWindowRegion component
 *
 * This file tests that the DragWindowRegion component renders correctly with and without a title,
 * displays the correct window control buttons, and triggers the appropriate window control functions
 * when those buttons are clicked.
 */

// Mock the window helpers to prevent actual window manipulation during tests
// We replace them with Jest mock functions that we can track
vi.mock("@/helpers/window_helpers", () => ({
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
}));

// Import the mocked functions so we can assert they were called
import {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
} from "@/helpers/window_helpers";

test("renders DragWindowRegion without title", () => {
  // Render the component without a title prop
  const { container, queryByText } = render(<DragWindowRegion />);

  // Check that the drag layer renders
  expect(container.querySelector(".draglayer")).toBeInTheDocument();

  // Verify that no title element is rendered when no title prop is provided
  expect(queryByText("Test Title")).not.toBeInTheDocument();
});

test("renders DragWindowRegion with title", () => {
  // Define a test title
  const title = "Test Title";

  // Render the component with a title prop
  const { getByText } = render(<DragWindowRegion title={title} />);

  // Check that the title is rendered in the document
  expect(getByText(title)).toBeInTheDocument();
});

test("renders window control buttons", () => {
  // Render the component
  const { getByTestId } = render(<DragWindowRegion />);

  // Check for minimize and restore buttons which have specific data-testid attributes
  expect(getByTestId("minimize-btn")).toBeInTheDocument();
  expect(getByTestId("restore-btn")).toBeInTheDocument();

  // Verify that the buttons have the correct titles
  expect(getByTestId("minimize-btn").title).toBe("Minimize");
  expect(getByTestId("restore-btn").title).toBe("Maximize/Restore");
});

test("calls window functions when buttons are clicked", () => {
  // Render the component
  const { getByTestId, getByTitle } = render(<DragWindowRegion />);

  // Test the minimize button click
  fireEvent.click(getByTestId("minimize-btn"));
  expect(minimizeWindow).toHaveBeenCalled();

  // Test the maximize/restore button click
  fireEvent.click(getByTestId("restore-btn"));
  expect(maximizeWindow).toHaveBeenCalled();

  // Test the close button click
  fireEvent.click(getByTitle("Close"));
  expect(closeWindow).toHaveBeenCalled();
});
