import { render } from "@testing-library/react";
import { test, expect } from "vitest";
import HomePage from "@/pages/HomePage";
import React from "react";

test("renders HomePage hero section", () => {
  const { getByText, getByTestId } = render(<HomePage />);
  // Check that the main header and subtitle are rendered.
  expect(getByText("Nakama")).toBeInTheDocument();
  expect(getByTestId("pageTitle")).toHaveTextContent(
    "Anilist Relationship Manager",
  );
});

test("renders all feature cards", () => {
  const { getByText } = render(<HomePage />);
  // Check that each feature card is visible by asserting the headers
  const featureCards = [
    "Relationship Management",
    "Activity Interactions",
    "Smart Follow",
    "Engagement Analytics",
    "Quick Actions",
    "Recent Activity",
  ];

  featureCards.forEach((header) => {
    expect(getByText(header)).toBeInTheDocument();
  });
});

// test("renders StatItem correctly", () => {
//   const { getByText } = render(<HomePage />);
//   expect(getByText("-")).toBeInTheDocument();
// });
