import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      // Any request beginning /met -> Met Office Data Hub (bypasses CORS in dev)
      '/met': {
        target: 'https://data.hub.api.metoffice.gov.uk',
        changeOrigin: true,
        secure: true,
        // keep rest of path (we’ll request /met/sitespecific/v0/point/…)
        rewrite: (p) => p.replace(/^\/met/, ''),
        configure: (proxy /* http-proxy */) => {
          // helpful logs in your Vite terminal
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[proxy]', req.method, req.url, '->', proxyRes.statusCode);
          });
          proxy.on('error', (err, req) => {
            console.error('[proxy error]', req?.method, req?.url, err?.code, err?.message);
          });

          // map our private header to the real 'apikey' header
          proxy.on('proxyReq', (proxyReq, req) => {
            let key = req.headers['x-metoffice-key'];
            if (Array.isArray(key)) key = key[0];

            // fallback: allow ?apikey=... locally when testing with curl
            if (!key && req.url) {
              try {
                const u = new URL(req.url, 'http://localhost');
                key = u.searchParams.get('apikey') || undefined;
              } catch { /* ignore */ }
            }

            if (key) {
              proxyReq.setHeader('apikey', key);
              proxyReq.setHeader('accept', 'application/json');
            }
            // don’t forward our private header upstream
            proxyReq.removeHeader?.('x-metoffice-key');
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        embed: path.resolve(__dirname, 'embed.html'),
      },
    },
  },
});
