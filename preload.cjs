const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("krakensNative", {
  getAlwaysOnTop: () => ipcRenderer.invoke("krakens:getAlwaysOnTop"),
  saveSnapshot: (payload) => ipcRenderer.invoke("krakens:saveSnapshot", payload),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("krakens:toggleAlwaysOnTop"),
});
