import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Web-only config for browser review
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@database': path.resolve(__dirname, '../Database'),
            '@resources': path.resolve(__dirname, '../Resources')
        }
    },
    server: {
        port: 5173,
        strictPort: true,
        fs: {
            allow: [path.resolve(__dirname, '..')]
        }
    }
})
