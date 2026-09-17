<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pb';

	onMount(() => {
		goto(pb.authStore.isValid ? '/dashboard' : '/login', { replaceState: true });
	});
</script>
