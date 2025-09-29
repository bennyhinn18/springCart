import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env vars so you can override the backend URL via VITE_API_BASE_URL
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy API requests in dev to the Spring Boot backend
        '/api': {
          target,
          changeOrigin: true
          // If your backend is served from a sub-path, you can also rewrite URLs:
          // rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
