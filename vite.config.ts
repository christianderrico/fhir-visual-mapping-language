import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  //TODO: REMOVE WITH A BACKEND
  server: {
    proxy: {
      "/fhir": {
        target: "https://gitlab.com",
        changeOrigin: true,
        rewrite: p => p.replace(/^\/fhir/, ""),
      },
    },
  },
})
