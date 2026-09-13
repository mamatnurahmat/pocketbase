<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		function onMessage(e: MessageEvent) {
			if (e.origin !== location.origin) return;
			if (e.data && e.data.type === 'p2s:back') goto('/dashboard');
		}
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});
</script>

<iframe
	src="/siteplan/index.html"
	title="Siteplan 3D Prestige 2 Sawangan"
	class="siteplan"
	allow="fullscreen"
></iframe>

<style>
	.siteplan {
		display: block;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		border: 0;
	}
</style>
