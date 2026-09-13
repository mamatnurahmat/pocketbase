// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	// Diinjeksi oleh Vite `define` di vite.config.ts
	const __BUILD_TIME__: string;

	interface ImportMetaEnv {
		readonly PUBLIC_PB_URL?: string;
		readonly PUBLIC_API_URL?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
