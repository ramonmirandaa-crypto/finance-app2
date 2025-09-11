import path from 'path';
import { jest } from '@jest/globals';

const execMock = jest.fn((cmd, cb) => cb(null, '', ''));
const createReadStream = jest.fn(() => ({}));
const unlinkSync = jest.fn();
const driveFilesCreate = jest.fn().mockResolvedValue({ data: { id: '1' } });
const driveFilesList = jest.fn().mockResolvedValue({ data: { files: [] } });
const driveFilesDelete = jest.fn();
const oauthInstance = { setCredentials: jest.fn() };
const OAuth2 = jest.fn(() => oauthInstance);
const drive = jest.fn(() => ({
  files: {
    create: driveFilesCreate,
    list: driveFilesList,
    delete: driveFilesDelete,
  },
}));

await jest.unstable_mockModule('child_process', () => ({ exec: execMock }));
await jest.unstable_mockModule('fs', () => ({
  default: { createReadStream, unlinkSync },
  createReadStream,
  unlinkSync,
}));
await jest.unstable_mockModule('googleapis', () => ({
  google: { auth: { OAuth2 }, drive },
}));

jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));

process.env.PGUSER = 'user';
process.env.PGPASSWORD = 'pass';
process.env.PGDATABASE = 'db';
process.env.DRIVE_FOLDER_ID = 'folder';
process.env.GOOGLE_CLIENT_ID = 'id';
process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.GOOGLE_REDIRECT_URI = 'uri';
process.env.GOOGLE_REFRESH_TOKEN = 'refresh';

const { runBackup } = await import('../../../scripts/backup.mjs');

afterAll(() => {
  jest.useRealTimers();
});

test.skip('runs pg_dump and uploads file to drive', async () => {
  await runBackup();
  const expectedPath = path.join(process.cwd(), 'backup-2024-01-01T00-00-00-000Z.dump');
  expect(execMock).toHaveBeenCalledWith(expect.stringContaining('pg_dump'), expect.any(Function));
  expect(createReadStream).toHaveBeenCalledWith(expectedPath);
  expect(unlinkSync).toHaveBeenCalledWith(expectedPath);
  expect(driveFilesCreate).toHaveBeenCalled();
  expect(driveFilesList).toHaveBeenCalled();
});

