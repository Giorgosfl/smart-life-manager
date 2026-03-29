import { BrowserWindow, BrowserView, ApplicationMenu } from "electrobun/bun";
import type { AppRPCSchema } from "../shared/rpc-schema";
import { handlers } from "./rpc-handlers";
import { hasCredentials } from "./store";

ApplicationMenu.setApplicationMenu([
  {
    label: "Smart Life Manager",
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "showAll" },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo", accelerator: "Cmd+Z" },
      { role: "redo", accelerator: "Cmd+Shift+Z" },
      { type: "separator" },
      { role: "cut", accelerator: "Cmd+X" },
      { role: "copy", accelerator: "Cmd+C" },
      { role: "paste", accelerator: "Cmd+V" },
      { role: "selectAll", accelerator: "Cmd+A" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize", accelerator: "Cmd+M" },
      { role: "close", accelerator: "Cmd+W" },
      { role: "toggleFullScreen", accelerator: "Cmd+Ctrl+F" },
    ],
  },
]);

const isDev = process.env.NODE_ENV !== "production";

const rpc = BrowserView.defineRPC<AppRPCSchema>({
  maxRequestTime: 30000,
  handlers: {
    requests: handlers,
  },
});

const needsSetup = !hasCredentials();

const url = isDev
  ? needsSetup
    ? "http://localhost:5173/#/setup"
    : "http://localhost:5173/"
  : needsSetup
    ? "views://mainview/index.html#/setup"
    : "views://mainview/index.html";

const win = new BrowserWindow({
  title: "Smart Life Manager",
  url,
  frame: {
    width: 1200,
    height: 800,
  },
  rpc,
});
