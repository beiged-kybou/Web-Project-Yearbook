#!/usr/bin/env node
import runTask from "./utils/runTask.mjs";
import { createDummyUsers } from "./tasks/createDummyUsers.mjs";

await runTask("create-dummy-users", createDummyUsers);
