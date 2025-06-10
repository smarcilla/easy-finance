import { OAuth2Client } from 'google-auth-library';

export async function getAuth() {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const tokens = {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  };

  client.setCredentials(tokens);
  return client;
}
