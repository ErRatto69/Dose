import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.VITE_BASE_URL || '/';
  const appName = env.VITE_APP_NAME || 'Dose - Bar & Drinking Tracker';
  const appShortName = env.VITE_APP_SHORT_NAME || 'Dose';
  const appDescription =
    env.VITE_APP_DESCRIPTION || 'Track drinks, measure BAC realtime, and discover craft cocktail recipes.';
  const devPort = Number(env.VITE_DEV_PORT) || 5155;
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5159';

  return {
    base: baseUrl,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.svg'],
        manifest: {
          name: appName,
          short_name: appShortName,
          description: appDescription,
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          scope: baseUrl,
          start_url: baseUrl,
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src')
      }
    },
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: false
        },
        '/storage': {
          target: devApiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
