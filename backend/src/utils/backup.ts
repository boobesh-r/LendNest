import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database.js';
import { CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDatabaseBackup(customBackupDir?: string): { success: boolean; backupPath: string; filename: string; sizeBytes: number } {
  const dbPath = path.isAbsolute(CONFIG.DATABASE_PATH)
    ? CONFIG.DATABASE_PATH
    : path.resolve(process.cwd(), CONFIG.DATABASE_PATH);
  const dbDir = path.dirname(dbPath);
  const backupsDir = customBackupDir || path.join(dbDir, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `lendnest-backup-${timestamp}.sqlite`;
  const backupPath = path.join(backupsDir, filename);

  // SQLite online snapshot backup via VACUUM INTO
  // Safe to run while readers/writers are active in WAL mode
  const escapedPath = backupPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escapedPath}';`);

  const stats = fs.statSync(backupPath);

  console.log(`[Backup] Database backup successfully created at: ${backupPath} (${stats.size} bytes)`);

  return {
    success: true,
    backupPath,
    filename,
    sizeBytes: stats.size,
  };
}

// Allow standalone execution via `tsx src/utils/backup.ts`
if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
  try {
    const result = createDatabaseBackup();
    console.log(`Backup completed: ${result.filename}`);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}
