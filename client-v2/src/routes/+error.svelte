<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authValid } from '$lib/auth';

	const status = $derived($page.status);
	const message = $derived($page.error?.message ?? 'Terjadi kesalahan.');
	const target = $derived($authValid ? '/dashboard' : '/login');
</script>

<div class="wrap">
	<div class="card box">
		<div class="ico">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
				<path
					d="M9 9l6 6M15 9l-6 6"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
				/>
			</svg>
		</div>
		<span class="code">{status}</span>
		<h1>
			{#if status === 404}
				Halaman tidak ditemukan
			{:else}
				Terjadi kesalahan
			{/if}
		</h1>
		<p class="msg">
			{#if status === 404}
				Alamat <code>{$page.url.pathname}</code> tidak tersedia.
			{:else}
				{message}
			{/if}
		</p>
		<button class="btn btn-primary" onclick={() => goto(target)} style="width: auto; padding: 0 22px;">
			Kembali
		</button>
	</div>
</div>

<style>
	.wrap {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 20px;
	}

	.box {
		max-width: 420px;
		width: 100%;
		padding: 32px 22px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
	}

	.ico {
		width: 64px;
		height: 64px;
		border-radius: 20px;
		background: var(--c-red-bg);
		color: var(--c-red);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.code {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--c-text-light);
	}

	h1 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.msg {
		font-size: 13.5px;
		color: var(--c-text-muted);
		line-height: 1.5;
	}

	code {
		font-family: var(--mono);
		font-size: 12px;
		background: var(--c-bg);
		padding: 2px 6px;
		border-radius: 4px;
		word-break: break-all;
	}
</style>
