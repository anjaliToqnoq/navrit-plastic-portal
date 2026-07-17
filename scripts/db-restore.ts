/**
 * Restore database from a backup in data/backups/
 * Usage:
 *   npx tsx scripts/db-restore.ts --list
 *   npx tsx scripts/db-restore.ts plastic-rates-....db
 *
 * Stop the app before restoring in production.
 */
import { listBackups, restoreBackup, formatBytes } from "../src/lib/backup";

const file = process.argv[2];

if (!file || file === "--list") {
  const list = listBackups();
  if (!list.length) {
    console.log("No backups found in data/backups/");
    process.exit(0);
  }
  console.log("Available backups:\n");
  for (const b of list) {
    console.log(`  ${b.filename}`);
    console.log(`    ${formatBytes(b.size)} · ${b.createdAt} · ${b.checksum.slice(0, 12)}…\n`);
  }
  if (!file) {
    console.log("Restore with: npm run db:restore -- <filename>");
  }
  process.exit(0);
}

try {
  const result = restoreBackup(file);
  console.log("Restore OK");
  console.log(`  restored: ${result.restored}`);
  console.log("  A safety backup of the previous DB was created (pre-restore).");
  console.log("  Restart the app now.");
} catch (e) {
  console.error("Restore failed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
