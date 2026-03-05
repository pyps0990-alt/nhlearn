import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // 換成 swc

export default defineConfig({
  plugins: [react()],
})