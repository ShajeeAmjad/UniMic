import { contextBridge, ipcRenderer } from "electron";

export interface UniMicAPI {
  startTyping: (text: string) => Promise<{ success: boolean; error?: string }>;
  transcribe: (audioBuffer: ArrayBuffer) => Promise<{ text: string; error?: string }>;
  getMode: () => Promise<string>;
  minimizeWidget: () => Promise<void>;
  showWidget: () => Promise<void>;
  resizeWidget: (width: number, height: number) => Promise<void>;
  moveWidget: (dx: number, dy: number) => Promise<void>;
  onActivateRecording: (callback: () => void) => void;
}

const api: UniMicAPI = {
  startTyping: (text: string) => ipcRenderer.invoke("start-typing", text),
  transcribe: (audioBuffer: ArrayBuffer) => ipcRenderer.invoke("transcribe", audioBuffer),
  getMode: () => ipcRenderer.invoke("get-mode"),
  minimizeWidget: () => ipcRenderer.invoke("minimize-widget"),
  showWidget: () => ipcRenderer.invoke("show-widget"),
  moveWidget: (dx: number, dy: number) => ipcRenderer.invoke("move-widget", dx, dy),
  resizeWidget: (width: number, height: number) =>
    ipcRenderer.invoke("resize-widget", width, height),
  onActivateRecording: (callback: () => void) => {
    ipcRenderer.on("activate-recording", () => callback());
  },
};

contextBridge.exposeInMainWorld("unimic", api);
