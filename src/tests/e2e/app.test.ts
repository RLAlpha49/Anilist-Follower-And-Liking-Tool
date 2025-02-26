import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/**
 * End-to-end tests for the Nakama Electron application
 *
 * This file contains tests that verify the application works correctly from
 * a user perspective, testing navigation between pages, UI interactions,
 * and window control functionality.
 *
 * Using Playwright with Electron:
 * https://www.electronjs.org/pt/docs/latest/tutorial/automated-testing#using-playwright
 */

// Store a reference to the Electron application instance
let electronApp: ElectronApplication;

test.beforeAll(async () => {
  // Find and parse the most recent build of the Electron app
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);

  // Set CI environment variable for e2e testing
  process.env.CI = "e2e";

  // Launch the Electron application
  electronApp = await electron.launch({
    args: [appInfo.main],
  });

  // Set up event handlers for new windows
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    // Log page errors and console messages for debugging
    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test("renders home page", async () => {
  // Get the main application window
  const page: Page = await electronApp.firstWindow();

  // Wait for the main heading and check its text
  const title = await page.waitForSelector("h1");
  const text = await title.textContent();
  expect(text).toBe("Nakama");
});

test("navigates to Follower And Following page", async () => {
  // Get the main application window
  const page: Page = await electronApp.firstWindow();

  // Click on the Followers navigation link
  await page.click('[data-testid="nav-followers"]');

  // Verify that the page heading changed to the expected text
  const heading = await page.waitForSelector("h1");
  const text = await heading.textContent();
  expect(text).toBe("Relationship Manager");
});

test("navigates to Activity Page", async () => {
  // Get the main application window
  const page: Page = await electronApp.firstWindow();

  // Click on the Activity navigation link
  await page.click('[data-testid="nav-activity"]');

  // Verify that the page heading changed to the expected text
  const heading = await page.waitForSelector("h1");
  const text = await heading.textContent();
  expect(text).toBe("Activity Page");
});

test("handles window control actions", async () => {
  // Get the main application window
  const page: Page = await electronApp.firstWindow();

  // Click the minimize button
  await page.click('[data-testid="minimize-btn"]');

  // Verify that the window was minimized
  const isMinimized = await electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return mainWindow.isMinimized();
  });
  expect(isMinimized).toBe(true);

  // Click the restore button
  await page.click('[data-testid="restore-btn"]');

  // Give the window time to restore
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify that the window is no longer minimized
  const isRestored = await electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return mainWindow.isMinimized();
  });
  expect(isRestored).toBe(false);
});

test("toggles theme when theme button is clicked", async () => {
  // Get the main application window
  const page: Page = await electronApp.firstWindow();

  // Navigate to home page by clicking the Home link in navigation
  await page.click('text="Home"');

  // Wait for the navigation to complete
  await page.waitForSelector("h1:has-text('Nakama')");

  // Find the theme toggle button - look for a button with either sun or moon icon
  const themeToggleButton = await page.waitForSelector(
    "button:has(svg.lucide-sun), button:has(svg.lucide-moon)",
  );

  // First, check the initial theme state
  const isDarkTheme = await page.evaluate(() => {
    // Check if HTML element has the dark class
    const isDark = document.documentElement.classList.contains("dark");
    const hasMoonIcon = !!document.querySelector("svg.lucide-moon");
    return isDark || hasMoonIcon;
  });

  // Click on the theme toggle button
  await themeToggleButton.click();

  // Wait for the theme to change
  await page.waitForTimeout(500);

  // Check if the theme has toggled
  const themeToggled = await page.evaluate((wasDarkTheme) => {
    // If we started with dark theme, check if it's now light
    const isDark = document.documentElement.classList.contains("dark");
    const hasSunIcon = !!document.querySelector("svg.lucide-sun");
    return wasDarkTheme ? !isDark || hasSunIcon : isDark || !hasSunIcon;
  }, isDarkTheme);

  // Verify that the theme changed
  expect(themeToggled).toBe(true);

  // Toggle back to original theme
  await themeToggleButton.click();

  // Wait for the theme to change back
  await page.waitForTimeout(500);

  // Check if the theme has toggled back
  const themeToggledBack = await page.evaluate((wasDarkTheme) => {
    // Check if we're back to the original theme
    const isDark = document.documentElement.classList.contains("dark");
    const hasMoonIcon = !!document.querySelector("svg.lucide-moon");
    return wasDarkTheme ? isDark || hasMoonIcon : !isDark || !hasMoonIcon;
  }, isDarkTheme);

  // Verify that the theme changed back
  expect(themeToggledBack).toBe(true);
});

// Take screenshots on test failures for debugging
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const page: Page = await electronApp.firstWindow();
    await page.screenshot({
      path: `playwright-report/${testInfo.title.replace(/ /g, "_")}-failure.png`,
    });
  }
});

// Clean up after all tests are complete
test.afterAll(async () => {
  await electronApp.close();
});
