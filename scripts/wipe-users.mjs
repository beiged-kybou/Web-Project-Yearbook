#!/usr/bin/env node
import runTask from "./utils/runTask.mjs";
import { wipeUsers } from "./tasks/wipeUsers.mjs";

await runTask("wipe-users", wipeUsers);
