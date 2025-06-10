import { google } from 'googleapis';
import { getAuth } from './auth';

export async function getDriveClient() {
  const auth = await getAuth();
  return google.drive({ version: 'v3', auth });
}
