// defineConfig z vitest/config zna klucz `test`; ten z 'vite' go nie zna i `tsc -b` padał na tym pliku.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';

export default defineConfig({
    plugins: [react()],
    define: {
        // sockjs-client references Node.js `global` - shim it for the browser
        global: 'globalThis',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        // Środowisko jsdom wybiera komentarz `// @vitest-environment jsdom` na początku pliku
        // testu - Vitest 4 nie ma już `environmentMatchGlobs`, ignorował go po cichu.
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        setupFiles: ['src/test/setup.ts'],
    },
    server: {
        port: 3000,
        // Budowanie aplikacji (gradlew, xcodebuild) zapisuje tysiące plików w android/ i ios/;
        // bez tego każde z nich przeładowywało stronę otwartą w emulatorze.
        watch: { ignored: ['**/android/**', '**/ios/**'] },
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path,
            },
            '/ws-registry': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    preview: {
        port: 4173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path,
            },
            '/ws-registry': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Force content-based hash for CSS files
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        // Generate content hash from CSS content
                        const content = assetInfo.source;
                        const hash = crypto.createHash('sha256')
                            .update(content as string)
                            .digest('hex')
                            .slice(0, 8);
                        return `assets/[name]-${hash}[extname]`;
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    }
});