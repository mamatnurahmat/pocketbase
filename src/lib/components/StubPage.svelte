<script lang="ts">
	import AppBar from './AppBar.svelte';

	let {
		title,
		subtitle = 'Segera hadir',
		note = ''
	}: {
		title: string;
		subtitle?: string;
		note?: string;
	} = $props();
</script>

<AppBar {title} {subtitle} back="/dashboard" />

<div class="page">
	<div class="card box">
		<div class="ico">
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
				<path
					d="M12 8v5M12 16v.5"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
				/>
			</svg>
		</div>
		<h2>{title}</h2>
		<p>
			Halaman ini sedang di-port dari client React lama ke SvelteKit. Fungsinya akan
			sama persis dengan versi lama, hanya dengan UI/UX yang lebih rapi.
		</p>
		{#if note}
			<p class="note">{note}</p>
		{/if}
		<a class="btn btn-soft" href="/dashboard" style="width: auto; padding: 0 18px;">
			Kembali ke Beranda
		</a>
	</div>
</div>

<style>
	.box {
		padding: 28px 22px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
	}

	.ico {
		width: 56px;
		height: 56px;
		border-radius: 18px;
		background: var(--c-primary-soft);
		color: var(--c-primary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	h2 {
		font-size: 18px;
		font-weight: 800;
	}

	p {
		font-size: 13.5px;
		color: var(--c-text-muted);
		line-height: 1.55;
		max-width: 380px;
	}

	.note {
		font-size: 12px;
		color: var(--c-text-light);
		background: var(--c-bg);
		padding: 8px 12px;
		border-radius: 10px;
	}
</style>
