import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Independent preview: no API proxy, production auth, environment secrets or session.
export default defineConfig({
  cacheDir: '.preview-cache',
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 5180, strictPort: true },
  build: {
    outDir: 'dist-intrapotrero',
    rollupOptions: { input: fileURLToPath(new URL('./preview/intrapotrero.html', import.meta.url)) },
  },
  optimizeDeps: { entries: ['preview/intrapotrero.html'] },
  resolve: {
    alias: [{ find: /^(?:\.\.\/)+context\/AuthContext\.jsx$/, replacement: fileURLToPath(new URL('./preview/PreviewAuth.jsx', import.meta.url)) }],
  },
  plugins: [react(), tailwindcss(), {
    name: 'intrapotrero-local-entry',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = '/preview/intrapotrero.html';
        next();
      });
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = '/preview/intrapotrero.html';
        next();
      });
    },
  }],
});
