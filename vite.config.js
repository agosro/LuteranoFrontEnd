import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ mode }) => {
  // Cargar variables de entorno (incluye .env, .env.local)
  const rootPath = new URL('.', import.meta.url).pathname
  const env = loadEnv(mode, rootPath)

  const apiUrl = env.VITE_API_URL || 'http://localhost:8080'

  return defineConfig({
    plugins: [react()],
    server: {
      historyApiFallback: true, // 👈 esto es clave
      // Proxy para evitar CORS en desarrollo. Las llamadas a '/api/*' se reenviarán a VITE_API_URL
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    // Nota: en runtime los clientes deben usar `import.meta.env.VITE_API_URL`.
  })
}
