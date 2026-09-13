<script lang="ts">
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pb';
	import { wargaPin, loadPin, unlock } from '$lib/idle';
	import { logout } from '$lib/auth';
	import { initialsOf } from '$lib/ui';
	import PinPad from './PinPad.svelte';

	let value = $state('');
	let error = $state(false);
	let shake = $state(false);

	const email = pb.authStore.record?.email as string | undefined;
	const name = (email || '').split('@')[0];

	async function verify(pin: string) {
		let expected = get(wargaPin);
		if (!expected) {
			await loadPin();
			expected = get(wargaPin);
		}
		if (pin === expected) {
			value = '';
			unlock();
		} else {
			error = true;
			shake = true;
			setTimeout(() => {
				shake = false;
				value = '';
			}, 500);
		}
	}

	function handleLogout() {
		logout();
		goto('/login', { replaceState: true });
	}
</script>

<div class="wrap">
	<div class="top">
		<div class="avatar">{initialsOf(name || 'W')}</div>
		<h1>Halo, {name || 'kembali'}</h1>
		<p class="sub">Masukkan PIN untuk melanjutkan.</p>
	</div>

	<div class="pad">
		<PinPad bind:value {shake} onComplete={verify} />
		{#if error}
			<p class="err">PIN salah. Coba lagi.</p>
		{/if}
	</div>

	<button class="ghost" onclick={handleLogout}>Keluar / Ganti Akun</button>
</div>

<style>
	.wrap {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: var(--c-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 32px 26px calc(32px + env(safe-area-inset-bottom, 0px));
		min-height: 100vh;
		min-height: 100dvh;
	}

	.top {
		text-align: center;
		padding-top: 24px;
	}

	.avatar {
		width: 72px;
		height: 72px;
		margin: 0 auto 16px;
		border-radius: 24px;
		background: var(--c-primary-gradient);
		color: #fff;
		font-size: 24px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 14px 30px -10px rgba(12, 107, 64, 0.55);
	}

	h1 {
		font-size: 20px;
		font-weight: 800;
		color: var(--c-text);
		text-transform: capitalize;
	}

	.sub {
		margin-top: 6px;
		font-size: 14px;
		color: var(--c-text-muted);
	}

	.pad {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.err {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-red);
		background: var(--c-red-bg);
		padding: 8px 16px;
		border-radius: 10px;
	}

	.ghost {
		background: none;
		border: none;
		font-size: 14px;
		font-weight: 600;
		color: var(--c-red);
		padding: 8px 16px;
	}
</style>
