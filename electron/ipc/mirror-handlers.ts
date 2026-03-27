import { ipcMain } from "electron";
import {
  getMirrorGroupsAction,
  createMirrorGroupAction,
  deleteMirrorGroupAction,
} from "../lib/actions";
import type { MirrorButton } from "@lib/types";

export function registerMirrorHandlers(): void {
  ipcMain.handle("mirrors:getAll", () => getMirrorGroupsAction());
  ipcMain.handle(
    "mirrors:create",
    (_e, name: string, main: MirrorButton, mirrors: MirrorButton[]) =>
      createMirrorGroupAction(name, main, mirrors)
  );
  ipcMain.handle("mirrors:delete", (_e, groupId: string) =>
    deleteMirrorGroupAction(groupId)
  );
}
