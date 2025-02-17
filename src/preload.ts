import { contextBridge, ipcRenderer } from "electron";
import exposeContexts from "./helpers/ipc/context-exposer";

// Expose our custom API
contextBridge.exposeInMainWorld("electronAPI", {
  // Your existing APIs may be here (e.g., openExternal)
  openExternal: (url: string) => ipcRenderer.send("open-external", url),

  // Save token API: sends token to main process
  saveToken: (token: string) => ipcRenderer.send("save-token", token),

  // Retrieve token API: returns token from main process
  getToken: () => ipcRenderer.invoke("get-token"),

  // Clear token API: clears token from main process
  clearToken: () => ipcRenderer.send("clear-token"),
});

// Call your existing context exposures
exposeContexts();
