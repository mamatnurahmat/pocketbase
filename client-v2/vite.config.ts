import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const pbUrl = env.PUBLIC_PB_URL || 'https://prestige2.sawangan.web.id';

	return {
		define: {
			__BUILD_TIME__: JSON.stringify(new Date().toISOString())
		},
		plugins: [
			sveltekit(),
			VitePWA({
				registerType: 'autoUpdate',
				injectRegister: false,
				includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
				manifest: {
					name: 'Warga P2S',
					short_name: 'WargaP2S',
					description: 'Aplikasi warga untuk iuran, tagihan, dan informasi RW 04',
					lang: 'id',
					start_url: '/',
					scope: '/',
					display: 'standalone',
					orientation: 'portrait',
					theme_color: '#15935A',
					background_color: '#F4F6F4',
					categories: ['finance', 'productivity'],
					icons: [
						{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
						{
							src: 'icons/icon-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
					navigateFallback: 'index.html',
					navigateFallbackDenylist: [/^\/api\//],
					cleanupOutdatedCaches: true,
					clientsClaim: true,
					skipWaiting: true
				}
			})
		],
		server: {
			host: '0.0.0.0',
			port: 5173,
			proxy: {
				// Proxy request /api/* ke PocketBase public agar autentikasi cookie
				// (kalau ada) tetap same-origin & tidak kena CORS saat dev.
				'/api': {
					target: pbUrl,
					changeOrigin: true,
					secure: true
				}
			}
		}
	};
});
