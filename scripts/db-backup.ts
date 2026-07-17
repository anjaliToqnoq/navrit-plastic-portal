/**
 * Create a safe SQLite backup into data/backups/
 * Usage: npx tsx scripts/db-backup.ts [reason]
 */
import { createBackup, formatBytes } from "../src/lib/backup";

const reason = process.argv[2] || "cli";

try {
  const info = createBackup(reason);
  console.log("Backup created:");
  console.log(`  file:     ${info.filename}`);
  console.log(`  size:     ${formatBytes(info.size)}`);
  console.log(`  checksum: ${info.checksum}`);
  console.log(`  created:  ${info.createdAt}`);
} catch (e) {
  console.error("Backup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
