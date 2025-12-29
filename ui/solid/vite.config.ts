import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3003',
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    minify: 'terser', // Re-enable minification for production
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    terserOptions: {
      compress: {
        // Remove console.* calls in production (except console.error and console.warn)
        drop_console: false, // We handle this in logger.ts based on environment
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove these specific calls
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    // Explicitly set production flag for logger
    'import.meta.env.PROD': JSON.stringify(true),
  },
});
