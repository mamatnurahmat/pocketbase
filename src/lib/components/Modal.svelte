<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title = '',
		maxWidth = 420,
		onClose,
		children
	}: {
		open?: boolean;
		title?: string;
		maxWidth?: number;
		onClose?: () => void;
		children: Snippet;
	} = $props();

	function close() {
		open = false;
		onClose?.();
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

{#if open}
	<div
		class="backdrop"
		onclick={onBackdrop}
		onkeydown={onKey}
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Dialog'}
		tabindex="-1"
	>
		<div class="panel" style="max-width: {maxWidth}px">
			{#if title}
				<div class="head">
					<h3>{title}</h3>
					<button class="x" onclick={close} aria-label="Tutup">✕</button>
				</div>
			{/if}
			<div class="body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 26, 20, 0.55);
		z-index: 9998;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.panel {
		background: var(--c-surface);
		border-radius: var(--radius-card);
		width: 100%;
		box-shadow: 0 24px 60px -20px rgba(15, 26, 20, 0.4);
		max-height: 92vh;
		overflow-y: auto;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 20px 8px;
	}

	h3 {
		font-size: 17px;
		font-weight: 800;
		color: var(--c-text);
	}

	.x {
		background: transparent;
		border: none;
		color: var(--c-text-muted);
		font-size: 18px;
		padding: 4px 8px;
	}

	.body {
		padding: 8px 20px 20px;
	}
</style>
