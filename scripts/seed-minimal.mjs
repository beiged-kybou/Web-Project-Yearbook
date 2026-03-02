#!/usr/bin/env node
import runTask from "./utils/runTask.mjs";
import { createDummyUsers } from "./tasks/createDummyUsers.mjs";
import { seedClubs } from "./tasks/seedClubs.mjs";

await runTask("seed-minimal", async () => {
  await seedClubs();
  await createDummyUsers();
});
