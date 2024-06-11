import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          wharfkit: [
            '@wharfkit/session',
          ],
          'whatfkit-plugin': [
            '@wharfkit/wallet-plugin-anchor',
            '@wharfkit/wallet-plugin-cloudwallet',
            '@wharfkit/web-renderer'
          ]
        }
      }
    }
  }
})
