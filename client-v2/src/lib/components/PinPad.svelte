<script lang="ts">
	let {
		value = $bindable(''),
		length = 6,
		shake = false,
		busy = false,
		onComplete
	}: {
		value?: string;
		length?: number;
		shake?: boolean;
		busy?: boolean;
		onComplete: (pin: string) => void;
	} = $props();

	function press(k: string) {
		if (busy || value.length >= length) return;
		value += k;
		if (value.length === length) {
			// biar animasi dot terlihat sedikit sebelum verifikasi
			setTimeout(() => onComplete(value), 120);
		}
	}

	function del() {
		if (busy || value.length === 0) return;
		value = value.slice(0, -1);
	}

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
</script>

<div class="dots" class:shake>
	{#each { length } as _, i}
		<div class="dot" class:on={i < value.length}></div>
	{/each}
</div>

<div class="pad">
	{#each keys as k, i (i)}
		{#if k === ''}
			<div></div>
		{:else if k === 'del'}
			<button class="key erase" onclick={del} aria-label="Hapus">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
					<path
						d="M9 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L2 12l7-7z"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
					/>
					<path
						d="M12 9l6 6M18 9l-6 6"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		{:else}
			<button class="key" onclick={() => press(k)}>{k}</button>
		{/if}
	{/each}
</div>

<style>
	.dots {
		display: flex;
		justify-content: center;
		gap: 16px;
		margin-bottom: 24px;
	}

	.dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--c-border);
		transition: transform 0.15s, background 0.15s;
	}

	.dot.on {
		background: var(--c-dark);
	}

	.dots.shake {
		animation: shake 0.42s ease;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		10%, 50%, 90% { transform: translateX(-6px); }
		30%, 70% { transform: translateX(6px); }
	}

	.pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		max-width: 280px;
		width: 100%;
		margin: 0 auto;
	}

	.key {
		height: 64px;
		border-radius: 20px;
		border: none;
		background: #fff;
		font-size: 26px;
		font-weight: 700;
		color: var(--c-dark);
		box-shadow: 0 1px 3px rgba(15, 26, 20, 0.06), 0 1px 2px rgba(15, 26, 20, 0.04);
		transition: transform 0.1s, background 0.1s;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.key:active {
		transform: scale(0.93);
		background: #E8EBE8;
	}

	.erase {
		background: transparent;
		box-shadow: none;
		color: var(--c-text-muted);
	}
</style>
