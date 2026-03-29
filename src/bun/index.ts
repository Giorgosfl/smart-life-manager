import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { AppRPCSchema } from "../shared/rpc-schema";
import { handlers } from "./rpc-handlers";
import { hasCredentials } from "./store";

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
