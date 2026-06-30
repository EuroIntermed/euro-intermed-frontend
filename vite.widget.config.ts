import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [react(), cssInjectedByJs()],
  // Vite library mode does NOT replace `process.env.NODE_ENV`, so the bundled
  // (dev) React keeps a literal `process.*` reference that throws
  // "ReferenceError: process is not defined" when widget.js runs in a browser.
  // Defining it here both kills that reference and ships React's production path.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'widget/widget-entry.tsx'),
      name: 'AngrosistChat',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      external: [],
    },
  },
})
