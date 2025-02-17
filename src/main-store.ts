// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storePromise: Promise<any> | null = null;

export async function getStore() {
  if (!storePromise) {
    // Dynamically import electron-store (ESM)
    storePromise = import("electron-store").then((mod) => new mod.default());
  }
  return storePromise;
}
