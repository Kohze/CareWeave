import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createRealtimeCall } from './server/realtime-session.js';
import {
  handleGmailAuth,
  handleGmailCallback,
  handleGmailDisconnect,
  handleGmailDrafts,
  handleGmailMessages,
  handleGmailStatus
} from './server/gmail-oauth.js';
import { handleWeather } from './server/weather.js';

function realtimeDevEndpoint(apiKey: string | undefined): Plugin {
  return {
    name: 'careweave-realtime-dev-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/realtime/session', (request, response, next) => {
        if (request.method !== 'POST') return next();
        const chunks: Buffer[] = [];
        request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        request.on('end', async () => {
          const upstream = await createRealtimeCall(Buffer.concat(chunks).toString('utf8'), apiKey);
          response.statusCode = upstream.status;
          response.setHeader('Content-Type', upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8');
          response.end(await upstream.text());
        });
      });
    }
  };
}

function gmailDevEndpoints(): Plugin {
	const handlers = new Map<string, (request: Request) => Promise<Response>>([
    ['/api/gmail/auth', handleGmailAuth],
    ['/api/gmail/callback', handleGmailCallback],
    ['/api/gmail/status', handleGmailStatus],
    ['/api/gmail/messages', handleGmailMessages],
    ['/api/gmail/drafts', handleGmailDrafts],
		['/api/gmail/disconnect', handleGmailDisconnect],
		['/api/weather', handleWeather]
  ]);
  return {
    name: 'careweave-gmail-dev-endpoints',
    configureServer(viteServer) {
      viteServer.middlewares.use((incoming, outgoing, next) => {
        const host = incoming.headers.host ?? 'localhost:5173';
        const url = new URL(incoming.url ?? '/', `http://${host}`);
        const handler = handlers.get(url.pathname);
        if (!handler) return next();
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        incoming.on('end', async () => {
          try {
            const headers = new Headers();
            for (const [name, value] of Object.entries(incoming.headers)) {
              if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
              else if (value !== undefined) headers.set(name, value);
            }
            const body = Buffer.concat(chunks).toString('utf8');
            const init: RequestInit & { duplex?: 'half' } = { method: incoming.method, headers };
            if (body && incoming.method !== 'GET' && incoming.method !== 'HEAD') {
              init.body = body;
              init.duplex = 'half';
            }
            const response = await handler(new Request(url, init));
            outgoing.statusCode = response.status;
            const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
            const setCookies = responseHeaders.getSetCookie?.() ?? [];
            for (const [name, value] of response.headers) {
              if (name.toLowerCase() !== 'set-cookie') outgoing.setHeader(name, value);
            }
            if (setCookies.length) outgoing.setHeader('Set-Cookie', setCookies);
            outgoing.end(Buffer.from(await response.arrayBuffer()));
          } catch {
            outgoing.statusCode = 500;
            outgoing.setHeader('Content-Type', 'application/json; charset=utf-8');
            outgoing.end(JSON.stringify({ error: 'Local Gmail endpoint failed.' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const name of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI', 'GMAIL_TOKEN_ENCRYPTION_KEY']) {
    if (env[name]) process.env[name] = env[name];
  }
  return {
    plugins: [realtimeDevEndpoint(env.OPENAI_API_KEY), gmailDevEndpoints(), sveltekit()],
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node'
    }
  };
});
