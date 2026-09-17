<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';

	let {
		title,
		subtitle = '',
		back = '',
		action
	}: {
		title: string;
		subtitle?: string;
		back?: string;
		action?: Snippet;
	} = $props();
</script>

<header class="bar">
	{#if back}
		<button
			class="ico"
			aria-label="Kembali"
			onclick={() => goto(back)}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path
					d="M15 5l-7 7 7 7"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{/if}
	<div class="mid">
		<span class="t">{title}</span>
		{#if subtitle}<span class="s">{subtitle}</span>{/if}
	</div>
	{#if action}
		<div class="act">{@render action()}</div>
	{/if}
</header>

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px 8px;
	}

	.ico {
		width: 38px;
		height: 38px;
		border-radius: 12px;
		border: none;
		background: var(--c-surface);
		border: 1.5px solid var(--c-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--c-text-muted);
	}

	.mid {
		flex: 1;
		min-width: 0;
	}

	.t {
		display: block;
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--c-text);
	}

	.s {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-muted);
		margin-top: 2px;
	}

	.act {
		flex: none;
	}
</style>
