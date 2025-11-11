import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ mode }) => {
  // Cargar variables de entorno (incluye .env, .env.local)
  const rootPath = new URL('.', import.meta.url).pathname
  // Cargar variables de entorno (incluye .env, .env.local)
  loadEnv(mode, rootPath)

  // Nota: el cliente usa import.meta.env.VITE_API_URL directamente; no se necesita apiUrl aquí

  return defineConfig({
    plugins: [react()],
    server: {
      historyApiFallback: true, // 👈 fallback SPA (Vite ya lo maneja, lo dejamos explícito)
    },
    // Nota: en runtime los clientes deben usar `import.meta.env.VITE_API_URL`.
  })
}
