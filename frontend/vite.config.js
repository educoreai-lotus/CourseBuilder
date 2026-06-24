import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const envDefine = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  )

  return {
    plugins: [react()],
    define: envDefine,
    server: {
      historyApiFallback: true,
      port: 5173
    }
  }
})
