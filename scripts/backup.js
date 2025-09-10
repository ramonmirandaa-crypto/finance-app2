import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import cron from 'node-cron';

const {
  PGHOST = 'localhost',
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGPORT = 5432,
  DRIVE_FOLDER_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
  BACKUP_RETENTION_DAYS = '7',
  CRON_SCHEDULE
} = process.env;

if (!PGUSER || !PGPASSWORD || !PGDATABASE || !DRIVE_FOLDER_ID || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error('Missing required env vars. Check configuration.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

async function createDump() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpPath = path.join(process.cwd(), `backup-${timestamp}.dump`);
  const connection = `postgresql://${PGUSER}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  await run(`pg_dump ${connection} -Fc -f ${dumpPath}`);
  return dumpPath;
}

async function uploadFile(filePath) {
  const fileMetadata = { name: path.basename(filePath), parents: [DRIVE_FOLDER_ID] };
  const media = { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
  return res.data.id;
}

async function cleanupOld() {
  const retentionMs = Number(BACKUP_RETENTION_DAYS) * 24 * 60 * 60 * 1000;
  const res = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime)'
  });
  const now = Date.now();
  const deletions = res.data.files
    .filter(f => now - new Date(f.createdTime).getTime() > retentionMs)
    .map(f => drive.files.delete({ fileId: f.id }));
  await Promise.all(deletions);
}

async function runBackup() {
  try {
    const dump = await createDump();
    await uploadFile(dump);
    fs.unlinkSync(dump);
    await cleanupOld();
    console.log('Backup completed');
  } catch (err) {
    console.error('Backup error', err);
  }
}

if (CRON_SCHEDULE) {
  cron.schedule(CRON_SCHEDULE, runBackup);
  console.log(`Backup scheduled with "${CRON_SCHEDULE}"`);
} else {
  runBackup();
}
