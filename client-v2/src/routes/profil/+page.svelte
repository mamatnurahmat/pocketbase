<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb, isDevMode, setDevMode } from '$lib/pb';
	import { displayName, isPengurus, isScurity, logout } from '$lib/auth';
	import { modePengurus } from '$lib/mode';
	import { initialsOf } from '$lib/ui';
	import AppBar from '$lib/components/AppBar.svelte';

	let devMode = $state(isDevMode());

	function toggleDev() {
		const next = !devMode;
		setDevMode(next);
		devMode = next;
		// Reload agar `applyDevMode()` aktif kembali di seluruh app.
		location.reload();
	}

	function toggleModePengurus() {
		modePengurus.toggle();
	}

	function handleLogout() {
		logout();
		goto('/login', { replaceState: true });
	}
</script>

<AppBar title="Profil" subtitle="Akun & preferensi" back="/dashboard" />

<div class="page">
	<div class="hero card">
		<div class="avatar">{initialsOf($displayName || 'W')}</div>
		<h2>{$displayName || 'Warga'}</h2>
		<p class="mail">{pb.authStore.record?.email ?? '—'}</p>
		<div class="chips">
			{#if $isPengurus}<span class="chip ok">Pengurus</span>{/if}
			{#if $isScurity}<span class="chip warn">Scurity</span>{/if}
			{#if !$isPengurus && !$isScurity}<span class="chip soft">Warga</span>{/if}
		</div>
	</div>

	<!-- ═══ Mode Pengurus toggle ═══ -->
	{#if $isPengurus}
		<h3 class="section-title">Preferensi</h3>
		<button
			class="mode-card"
			class:on={$modePengurus}
			onclick={toggleModePengurus}
			type="button"
		>
			<div class="mode-info">
				<span class="mode-ico">{$modePengurus ? '⭐' : '👤'}</span>
				<div>
					<div class="mode-t" class:on={$modePengurus}>
						{$modePengurus ? 'Mode Pengurus' : 'Mode Warga'}
					</div>
					<div class="mode-s" class:on={$modePengurus}>
						{$modePengurus ? 'Lihat semua data warga' : 'Lihat data sendiri'}
					</div>
				</div>
			</div>
			<div class="switch" class:on={$modePengurus}>
				<div class="thumb"></div>
			</div>
		</button>

		<!-- Dev mode (sub-preferensi) -->
		<div class="card row-item" style="margin-top: 10px">
			<div class="mid">
				<span class="t">Mode Dev</span>
				<span class="s">Semua collection pakai prefix <code>dev_</code></span>
			</div>
			<button
				class="mini-toggle"
				class:on={devMode}
				onclick={toggleDev}
				aria-pressed={devMode}
				aria-label="Aktifkan mode dev"
			>
				<span class="thumb-sm"></span>
			</button>
		</div>
	{/if}

	<h3 class="section-title">Akun</h3>
	<div class="card">
		<button class="menu-item danger" onclick={handleLogout}>
			<span>Keluar</span>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
				<path
					d="M15 16l4-4-4-4M19 12H9"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.hero {
		padding: 22px 18px;
		text-align: center;
	}

	.avatar {
		width: 64px;
		height: 64px;
		margin: 0 auto 12px;
		border-radius: 50%;
		background: var(--c-primary-gradient);
		color: #fff;
		font-size: 22px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	h2 {
		font-size: 18px;
		font-weight: 800;
		text-transform: capitalize;
	}

	.mail {
		margin-top: 4px;
		font-size: 13px;
		color: var(--c-text-muted);
		word-break: break-all;
	}

	.chips {
		margin-top: 12px;
		display: flex;
		gap: 6px;
		justify-content: center;
	}

	/* ── Mode Pengurus card ── */
	.mode-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		border-radius: var(--radius-card);
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		font-family: inherit;
		transition: background 0.15s, border-color 0.15s;
		cursor: pointer;
	}

	.mode-card.on {
		background: var(--c-primary-soft);
		border-color: var(--c-primary);
	}

	.mode-info {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.mode-ico {
		font-size: 20px;
	}

	.mode-t {
		font-size: 14px;
		font-weight: 700;
		color: var(--c-text);
	}

	.mode-t.on {
		color: var(--c-primary);
	}

	.mode-s {
		font-size: 12px;
		color: var(--c-text-light);
		margin-top: 2px;
	}

	.mode-s.on {
		color: var(--c-primary-dark);
	}

	.switch {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: #d0d8d2;
		position: relative;
		transition: background 0.2s;
	}

	.switch.on {
		background: var(--c-primary);
	}

	.switch .thumb {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		top: 2px;
		left: 2px;
		transition: left 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.switch.on .thumb {
		left: 22px;
	}

	/* ── Dev mode row ── */
	.row-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
	}

	.mid {
		flex: 1;
		min-width: 0;
	}

	.t {
		display: block;
		font-size: 14px;
		font-weight: 700;
	}

	.s {
		display: block;
		font-size: 12px;
		color: var(--c-text-muted);
		margin-top: 2px;
	}

	code {
		font-family: var(--mono);
		font-size: 11.5px;
		background: var(--c-bg);
		padding: 1px 6px;
		border-radius: 4px;
	}

	.mini-toggle {
		width: 44px;
		height: 26px;
		border-radius: 999px;
		background: var(--c-border);
		border: none;
		padding: 3px;
		position: relative;
		transition: background 0.15s;
	}

	.mini-toggle .thumb-sm {
		display: block;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.15s;
	}

	.mini-toggle.on {
		background: var(--c-primary);
	}

	.mini-toggle.on .thumb-sm {
		transform: translateX(18px);
	}

	/* ── Logout ── */
	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: transparent;
		border: none;
		font-size: 14px;
		font-weight: 700;
	}

	.menu-item.danger {
		color: var(--c-red);
	}
</style>
