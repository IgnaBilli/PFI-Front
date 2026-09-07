import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const { DEV_API_PROXY_TARGET } = loadEnv(mode, process.cwd(), 'DEV_')
  return {
  server: DEV_API_PROXY_TARGET ? {
    proxy: {
      '/api': {
        target: DEV_API_PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  } : undefined,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
  }
})
