// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const EXEC_PATH = '/macros/s/AKfycby6WSnTpbeGWBfu_ckjtutNbw12b1SxhmnmZV5Up9tifw26OHummN0FNK395JamPhth-Q/exec';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/device-api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (p) => {
          const q = p.indexOf('?');
          const qs = q >= 0 ? p.slice(q) : '';
          return EXEC_PATH + qs;           // -> /macros/.../exec?code=...
        },
        headers: {
          accept: 'application/json,text/javascript,*/*;q=0.1',
          'user-agent': 'Mozilla/5.0',
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
  define: {
    // Expose package.json version to the app
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
});
