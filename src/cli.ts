#!/usr/bin/env bun
import { main } from "./sdk/cli/index.ts";
await main(process.argv.slice(2));
