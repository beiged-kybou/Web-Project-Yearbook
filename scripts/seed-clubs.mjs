#!/usr/bin/env node
import runTask from "./utils/runTask.mjs";
import { seedClubs } from "./tasks/seedClubs.mjs";

await runTask("seed-clubs", seedClubs);
