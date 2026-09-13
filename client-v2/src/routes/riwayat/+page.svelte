<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// /riwayat tanpa walletId tidak punya konteks apa pun — arahkan ke dashboard.
	onMount(() => goto('/dashboard', { replaceState: true }));
</script>
