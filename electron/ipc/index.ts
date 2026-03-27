import { registerTuyaHandlers } from "./tuya-handlers";
import { registerMirrorHandlers } from "./mirror-handlers";
import { registerCredentialHandlers } from "./credential-handlers";

export function registerAllHandlers(): void {
  registerCredentialHandlers();
  registerTuyaHandlers();
  registerMirrorHandlers();
}
