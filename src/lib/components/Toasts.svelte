<script lang="ts">
	import { toasts } from '$lib/ui';
</script>

<div class="stack">
	{#each $toasts as t (t.id)}
		<div class="toast toast-{t.kind}">{t.text}</div>
	{/each}
</div>

<style>
	.stack {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 500;
		pointer-events: none;
	}

	.toast {
		padding: 10px 16px;
		border-radius: 12px;
		font-size: 13.5px;
		font-weight: 700;
		box-shadow: 0 12px 24px -10px rgba(15, 26, 20, 0.35);
		pointer-events: auto;
	}

	.toast-ok {
		background: var(--c-green);
		color: #fff;
	}

	.toast-err {
		background: var(--c-red);
		color: #fff;
	}

	.toast-info {
		background: var(--c-dark);
		color: #fff;
	}
</style>
