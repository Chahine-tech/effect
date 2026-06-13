import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/health": "http://localhost:3000",
      "/auth": "http://localhost:3000",
      "/users": "http://localhost:3000",
      "/metrics": "http://localhost:3000",
      "/events": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
})
