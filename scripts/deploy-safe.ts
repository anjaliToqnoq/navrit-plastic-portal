/**
 * Safe deploy: backup → npm ci → build
 * Usage: npx tsx scripts/deploy-safe.ts
 * Then restart: pm2 restart navrit
 */
import { spawnSync } from "child_process";
import { createBackup, formatBytes } from "../src/lib/backup";

function run(cmd: string, args: string[]) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status || 1);
}

try {
  const info = createBackup("pre-deploy");
  console.log(`Pre-deploy backup: ${info.filename} (${formatBytes(info.size)})`);
  console.log(`Checksum: ${info.checksum}`);
} catch (e) {
  console.error("Backup failed — aborting deploy:", e instanceof Error ? e.message : e);
  process.exit(1);
}

run("npm", ["install"]);
run("npm", ["run", "build"]);

console.log("\nBuild complete. Restart the process:");
console.log("  pm2 restart navrit");
console.log("  # or: npm start");
