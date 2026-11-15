import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => {
  const isProdBuild = command === 'build' && !process.env.VITEST;
  if (isProdBuild) {
    process.env.NODE_ENV = 'production';
  }

  return {
    plugins: [react(), tailwindcss()],
    define: isProdBuild
      ? {
          'process.env.NODE_ENV': JSON.stringify('production'),
        }
      : undefined,
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (
              /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)
            ) {
              return 'vendor-react';
            }
            return 'vendor';
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js'],
    },
  };
});
