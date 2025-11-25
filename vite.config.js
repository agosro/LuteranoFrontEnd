import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ mode }) => {
  const rootPath = new URL('.', import.meta.url).pathname



  return defineConfig({
    plugins: [react()],
    server: {
      host: '0.0.0.0', // 👈 expone en la red
      port: 5173,      // 👈 puerto fijo
      // strictPort: true, // opcional, para que falle si 5173 está ocupado
    },
    // Vite ya maneja el fallback para SPA, no hace falta historyApiFallback aquí
  })
}
