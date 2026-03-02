#!/usr/bin/env node
import process from "node:process";

import { connectDB } from "../../backend/src/config/database.js";

export async function runTask(taskName, handler) {
  const conn = await connectDB();
  const start = Date.now();
  console.log(`[${taskName}] starting...`);

  try {
    await handler();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[${taskName}] completed in ${duration}s.`);
  } catch (error) {
    console.error(`[${taskName}] failed:`, error);
    process.exitCode = 1;
  } finally {
    try {
      await conn.disconnect();
    } catch (closeError) {
      console.error("Failed to close database connection:", closeError);
    }
  }
}

export default runTask;
