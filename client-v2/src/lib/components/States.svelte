<script lang="ts">
	let {
		kind,
		title = '',
		text = '',
		rows = 4,
		onRetry
	}: {
		kind: 'loading' | 'error' | 'empty';
		title?: string;
		text?: string;
		rows?: number;
		onRetry?: () => void;
	} = $props();
</script>

{#if kind === 'loading'}
	<div class="skel-list">
		{#each { length: rows } as _}
			<div class="skel"></div>
		{/each}
	</div>
{:else if kind === 'error'}
	<div class="box err">
		<p class="msg">{text || 'Terjadi kesalahan.'}</p>
		{#if onRetry}
			<button class="retry" onclick={onRetry}>Coba lagi</button>
		{/if}
	</div>
{:else}
	<div class="box empty">
		<p class="title">{title || 'Belum ada data'}</p>
		{#if text}<p class="msg">{text}</p>{/if}
	</div>
{/if}

<style>
	.skel-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.skel {
		height: 64px;
		border-radius: 16px;
		background: linear-gradient(
			90deg,
			var(--c-border-light) 25%,
			var(--c-border) 50%,
			var(--c-border-light) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.3s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.box {
		background: var(--c-surface);
		border: 1px solid var(--c-border-light);
		border-radius: var(--radius-card);
		padding: 28px 20px;
		text-align: center;
	}

	.title {
		font-size: 14px;
		font-weight: 800;
		color: var(--c-text);
	}

	.msg {
		margin-top: 6px;
		font-size: 13px;
		color: var(--c-text-muted);
		line-height: 1.5;
	}

	.err .msg {
		color: var(--c-red);
		font-weight: 600;
	}

	.retry {
		margin-top: 14px;
		padding: 8px 18px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		border-radius: 10px;
		font-size: 13px;
		font-weight: 700;
		color: var(--c-text);
	}
</style>
