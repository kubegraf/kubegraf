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
        manualChunks: (id) => {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // Split large chart/visualization libraries
            if (id.includes('d3') || id.includes('chart')) {
              return 'charts';
            }
            // Split SolidJS core
            if (id.includes('solid-js')) {
              return 'solid';
            }
            // Split other large dependencies
            if (id.includes('@solidjs/router')) {
              return 'router';
            }
            // All other vendor dependencies
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800, // Increase limit to 800kb (still warns, but less aggressive)
  },
  define: {
    // Explicitly set production flag for logger
    'import.meta.env.PROD': JSON.stringify(true),
  },
});
