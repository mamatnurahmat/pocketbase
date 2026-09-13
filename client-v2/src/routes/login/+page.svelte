<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { login, authValid } from '$lib/auth';

	let identity = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	// Kalau user buka /login sedangkan sesi masih valid (mis. reload),
	// langsung antar ke dashboard supaya tidak stuck di halaman login.
	onMount(() => {
		if ($authValid) goto('/dashboard', { replaceState: true });
	});

	async function submit(e: Event) {
		e.preventDefault();
		if (busy) return;
		error = '';
		busy = true;
		try {
			await login(identity, password);
			await goto('/dashboard', { replaceState: true });
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: 'Email atau Password salah.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="page auth">
	<div class="top">
		<div class="logo">
			<svg width="34" height="34" viewBox="0 0 24 24" fill="none">
				<path
					d="M3 11.5L12 4l9 7.5"
					stroke="#fff"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M5 10.5V20h14v-9.5"
					stroke="#fff"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M10 20v-5h4v5"
					stroke="#fff"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>
		<h1>Masuk ke Warga P2S</h1>
		<p class="sub">Satu pintu untuk iuran, laporan, dan informasi warga.</p>
	</div>

	{#if error}
		<div class="f-error" role="alert">{error}</div>
	{/if}

	<form onsubmit={submit} class="form">
		<label class="field">
			<span class="f-label">Email</span>
			<input
				class="f-input"
				type="text"
				inputmode="email"
				autocomplete="username"
				bind:value={identity}
				placeholder="c09@warga.local"
				disabled={busy}
				required
			/>
			<p class="f-hint">
				Format: kode rumah @warga.local (contoh: c09@warga.local, kas@warga.local)
			</p>
		</label>

		<label class="field">
			<span class="f-label">Password</span>
			<input
				class="f-input"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				placeholder="Masukkan password"
				disabled={busy}
				required
			/>
		</label>

		<button class="btn btn-primary" type="submit" disabled={busy}>
			{busy ? 'Sedang masuk…' : 'Masuk'}
		</button>
	</form>
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 0 auto;
		padding: 32px 22px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.top {
		padding-top: 12px;
	}

	.logo {
		width: 60px;
		height: 60px;
		border-radius: 19px;
		background: var(--c-primary-gradient);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 14px 30px -10px rgba(12, 107, 64, 0.55);
	}

	h1 {
		margin-top: 22px;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}

	.sub {
		margin-top: 8px;
		font-size: 14.5px;
		color: var(--c-text-muted);
		line-height: 1.5;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: block;
	}
</style>
