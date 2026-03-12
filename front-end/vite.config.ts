import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readdirSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

/**
 * MPA: Auto-detect HTML files in root directory
 * เพิ่มไฟล์ .html ใหม่ที่ root จะถูก build อัตโนมัติ
 */
function getHtmlEntries() {
  const entries: Record<string, string> = {};
  const htmlFiles = readdirSync(__dirname).filter((f) => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const name = file.replace('.html', '');
    entries[name] = path.resolve(__dirname, file);
  }

  return entries;
}

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ];

  // Compression for production
  if (mode === 'production') {
    plugins.push(
      viteCompression({
        algorithm: 'gzip',
        threshold: 1024,
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      })
    );
  }

  // Bundle analyzer (ANALYZE=true pnpm build)
  if (process.env.ANALYZE) {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    plugins,
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: false,
      target: 'es2020',
      rollupOptions: {
        input: getHtmlEntries(),
        output: {
          manualChunks: (id) => {
            // React core - rarely changes
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor';
            }
            // Form libraries
            if (id.includes('zod') || id.includes('react-select')) {
              return 'form';
            }
            // HTTP + utilities
            if (id.includes('axios') || id.includes('compressorjs')) {
              return 'utils';
            }
          },
          chunkFileNames: 'assets/[name]-[hash:8].js',
          entryFileNames: 'assets/[name]-[hash:8].js',
          assetFileNames: 'assets/[name]-[hash:8].[ext]',
        },
      },
      chunkSizeWarningLimit: 500,
    },
    server: {
      port: 3000,
      strictPort: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'axios', 'zod'],
    },
  };
});
