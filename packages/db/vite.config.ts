import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'DB',
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
})