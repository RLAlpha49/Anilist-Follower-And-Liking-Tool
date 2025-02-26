import { render, screen } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import NavigationMenu from "@/components/NavigationMenu";
import React from "react";

/**
 * Test suite for the NavigationMenu component
 *
 * This file tests that the NavigationMenu component renders correctly with all
 * navigation items, proper data-testid attributes, and includes the ToggleTheme component.
 */

// Mock the router components to avoid actual routing during tests
// Use spans instead of anchors to avoid nesting <a> inside <a> which causes hydration errors
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <span data-href={to} data-testid={`link-to-${to}`}>
      {children}
    </span>
  ),
}));

// Mock all the navigation menu components
vi.mock("@/components/ui/navigation-menu", () => ({
  NavigationMenu: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="navigation-menu" className={className}>
      {children}
    </div>
  ),
  NavigationMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navigation-menu-item">{children}</div>
  ),
  NavigationMenuLink: ({
    children,
    className,
    "data-testid": dataTestId,
  }: {
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
  }) => (
    <span
      data-testid={dataTestId || "navigation-menu-link"}
      className={className}
    >
      {children}
    </span>
  ),
  NavigationMenuList: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="navigation-menu-list" className={className}>
      {children}
    </div>
  ),
  navigationMenuTriggerStyle: () => "navigation-menu-trigger-style",
}));

// Mock the ToggleTheme component to simplify testing
vi.mock("@/components/ToggleTheme", () => ({
  default: () => <div data-testid="toggle-theme">ToggleTheme</div>,
}));

test("renders NavigationMenu with all navigation items", () => {
  // Render the component
  render(<NavigationMenu />);

  // Check that all navigation links are present in the rendered component
  expect(screen.getByText("Home")).toBeInTheDocument();
  expect(screen.getByText("Follower And Following")).toBeInTheDocument();
  expect(screen.getByText("Activity")).toBeInTheDocument();

  // Check that Settings icon is present (can't check text as it's an icon)
  expect(screen.getByTestId("link-to-/settings")).toBeInTheDocument();
});

test("renders NavigationMenu with correct data-testid attributes", () => {
  // Render the component
  render(<NavigationMenu />);

  // Check for the specific data-testid attributes used in e2e tests
  // These are important for ensuring e2e tests can reliably find elements
  expect(screen.getByTestId("nav-followers")).toBeInTheDocument();
  expect(screen.getByTestId("nav-activity")).toBeInTheDocument();
});

test("includes ToggleTheme component", () => {
  // Render the component
  render(<NavigationMenu />);

  // Check that the ToggleTheme component is rendered within the NavigationMenu
  expect(screen.getByTestId("toggle-theme")).toBeInTheDocument();
});
