import { render } from "@testing-library/react";
import { test, expect } from "vitest";
import HomePage from "@/pages/HomePage";
import React from "react";

/**
 * Test suite for the HomePage component
 *
 * This file tests that the HomePage component renders correctly with its hero section,
 * feature cards, stat items, and quick action buttons.
 */

test("renders HomePage hero section", () => {
  // Render the HomePage component
  const { getByText, getByTestId } = render(<HomePage />);

  // Check that the main header and subtitle are rendered with the correct text
  expect(getByText("Nakama")).toBeInTheDocument();
  expect(getByTestId("pageTitle")).toHaveTextContent(
    "Anilist Relationship Manager",
  );
});

test("renders all feature cards", () => {
  // Render the HomePage component
  const { getByText } = render(<HomePage />);

  // Define the list of feature card headers that should be present
  const featureCards = [
    "Relationship Management",
    "Activity Interactions",
    "Smart Follow",
    "Engagement Analytics",
    "Quick Actions",
    "Recent Activity",
  ];

  // Check that each feature card header is visible in the document
  featureCards.forEach((header) => {
    expect(getByText(header)).toBeInTheDocument();
  });
});

test("renders StatItem correctly", () => {
  // Render the HomePage component
  const { getAllByText } = render(<HomePage />);

  // The StatItem component has placeholder values "-" for stats when no real data is available
  const placeholders = getAllByText("-");

  // Verify we have exactly four stat items with placeholder values
  expect(placeholders.length).toBe(4);

  // Check that all expected stat labels are present
  expect(getAllByText("Total Followers")[0]).toBeInTheDocument();
  expect(getAllByText("Total Following")[0]).toBeInTheDocument();
  expect(getAllByText("Pending Actions")[0]).toBeInTheDocument();
  expect(getAllByText("Recent Likes")[0]).toBeInTheDocument();
});

test("renders quick action buttons", () => {
  // Render the HomePage component
  const { getByText } = render(<HomePage />);

  // Define the list of quick action buttons that should be present
  const actionButtons = [
    "Run Safety Check",
    "Sync Data",
    "Export Data",
    "View Logs",
  ];

  // Check that each quick action button is visible in the document
  actionButtons.forEach((buttonText) => {
    expect(getByText(buttonText)).toBeInTheDocument();
  });
});
