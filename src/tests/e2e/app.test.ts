import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/*
 * Using Playwright with Electron:
 * https://www.electronjs.org/pt/docs/latest/tutorial/automated-testing#using-playwright
 */

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);
  process.env.CI = "e2e";

  electronApp = await electron.launch({
    args: [appInfo.main],
  });
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test("renders home page", async () => {
  const page: Page = await electronApp.firstWindow();
  const title = await page.waitForSelector("h1");
  const text = await title.textContent();
  expect(text).toBe("Nakama");
});

test("navigates to Follower And Following page", async () => {
  const page: Page = await electronApp.firstWindow();
  await page.click('[data-testid="nav-followers"]');
  const heading = await page.waitForSelector("h1");
  const text = await heading.textContent();
  expect(text).toBe("Follower And Following");
});

test("navigates to Activity Page", async () => {
  const page: Page = await electronApp.firstWindow();
  await page.click('[data-testid="nav-activity"]');
  const heading = await page.waitForSelector("h1");
  const text = await heading.textContent();
  expect(text).toBe("Activity Page");
});

test("handles window control actions", async () => {
  const page: Page = await electronApp.firstWindow();
  await page.click('[data-testid="minimize-btn"]');
  const isMinimized = await electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return mainWindow.isMinimized();
  });
  expect(isMinimized).toBe(true);

  await page.click('[data-testid="restore-btn"]');
  await new Promise((resolve) => setTimeout(resolve, 500));
  const isRestored = await electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return mainWindow.isMinimized();
  });
  expect(isRestored).toBe(false);
});

// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const page: Page = await electronApp.firstWindow();
    await page.screenshot({
      path: `playwright-report/${testInfo.title.replace(/ /g, "_")}-failure.png`,
    });
  }
});

test.afterAll(async () => {
  await electronApp.close();
});
