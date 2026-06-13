import http from 'node:http';
import { URL } from 'node:url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const PORT = 3002;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
} = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  console.error('Faltan GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET en .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/drive.file',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
});

console.log('\nAbrí esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\nEsperando callback en:', REDIRECT_URI);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);

    if (url.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400);
      res.end(`OAuth error: ${error}`);
      console.error('OAuth error:', error);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end('No se recibió code');
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Token generado. Ya podés cerrar esta pestaña y volver a la terminal.');

    console.log('\n=== TOKENS RECIBIDOS ===\n');
    console.log('ACCESS_TOKEN:', tokens.access_token ? '[recibido]' : '[no recibido]');
    console.log('REFRESH_TOKEN:\n');
    console.log(tokens.refresh_token || '(NO VINO REFRESH TOKEN)');
    console.log('\nPegá este valor en backend/.env como:');
    console.log('\nGOOGLE_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nSi no vino refresh_token, revocá el acceso de la app en tu cuenta Google y corré el script de nuevo.');

    server.close();
  } catch (err) {
    res.writeHead(500);
    res.end('Error generando token');
    console.error(err);
    server.close();
  }
});

server.listen(PORT);