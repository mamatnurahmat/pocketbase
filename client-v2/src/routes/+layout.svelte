<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import '../app.css';

	import { authValid, isPengurus, isScurity, logout } from '$lib/auth';
	import { viewMode } from '$lib/viewMode';
	import { locked, installIdle, loadPin } from '$lib/idle';
	import PinLock from '$lib/components/PinLock.svelte';
	import Toasts from '$lib/components/Toasts.svelte';

	let { children } = $props();

	onMount(() => {
		viewMode.init();
		const cleanup = installIdle();
		if ($authValid) void loadPin();
		return cleanup;
	});

	// Route guard sederhana — redirect ke /login kalau belum auth (kecuali di /login).
	$effect(() => {
		const path = $page.url.pathname;
		if (path === '/login' || path === '/') return;
		if (!$authValid) {
			goto('/login', { replaceState: true });
		}
	});

	const allItems = [
		{ label: 'Beranda', href: '/dashboard', icon: 'home' },
		{ label: 'Tagihan', href: '/tagihan', icon: 'bill', role: 'all' },
		{ label: 'Lapor', href: '/lapor', icon: 'chat', role: 'all' },
		{ label: 'Siteplan', href: '/map', icon: 'map', role: 'all' },
		{ label: 'Lap. Warga', href: '/laporan-warga', icon: 'note', role: 'nonScurity' },
		{ label: 'Warga', href: '/warga', icon: 'people', role: 'all' },
		{ label: 'Mutasi', href: '/mutasi', icon: 'list', role: 'all' },
		{ label: 'Pembayaran', href: '/payout', icon: 'plus-circle', role: 'pengurus' },
		{ label: 'Notifikasi', href: '/notifikasi', icon: 'bell', role: 'all' },
		{ label: 'Profil', href: '/profil', icon: 'user', role: 'all' }
	];

	// Halaman Upload Bukti (/iuran), Lampiran (/lampiran), Rekon (/rekon), dan
	// Laporan Scurity (/laporan-scurity) sengaja dihilangkan dari navigasi.
	// Route-nya tetap ada supaya URL direct tidak 404, tapi tidak ada link ke sana.

	const scurityAllowed = new Set(['/dashboard', '/lapor', '/warga', '/profil', '/map']);

	function visibleItems(pengurus: boolean, scurity: boolean) {
		return allItems.filter((it) => {
			if (scurity) return scurityAllowed.has(it.href);
			if (it.role === 'pengurus' && !pengurus) return false;
			return true;
		});
	}

	const items = $derived(visibleItems($isPengurus, $isScurity));

	const bottomPaths = new Set(['/dashboard', '/tagihan', '/payout', '/lapor', '/profil']);
	const bottomScurity = new Set(['/dashboard', '/lapor', '/warga', '/profil']);

	const bottomItems = $derived(
		$isScurity
			? allItems.filter((i) => bottomScurity.has(i.href))
			: allItems.filter(
					(i) => bottomPaths.has(i.href) && (i.role !== 'pengurus' || $isPengurus)
				)
	);

	const isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/');
	const isImmersive = $derived($page.url.pathname.startsWith('/map'));
	const isDesktop = $derived($viewMode === 'desktop');
	const showChrome = $derived(!isAuthPage && $authValid && !isImmersive);

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/dashboard') return path === '/dashboard';
		// Highlight parent menu juga saat berada di sub-route
		// (mis. `/riwayat/:walletId` → tab "Mutasi"/"Riwayat" nanti).
		return path === href || path.startsWith(href + '/');
	}
</script>

<div class="shell" class:desktop={isDesktop} class:immersive={isImmersive}>
	{#if showChrome && isDesktop}
		<aside class="sidebar">
			<div class="brand">
				<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
					<path d="M3 11.5L12 4l9 7.5" stroke="#15935A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M5 10.5V20h14v-9.5" stroke="#15935A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M10 20v-5h4v5" stroke="#15935A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<span>Warga P2S</span>
			</div>
			<nav class="side-nav">
				{#each items as it (it.href)}
					<a
						href={it.href}
						class="side-item"
						class:active={isActive(it.href)}
					>
						<span class="dot" aria-hidden="true"></span>
						<span>{it.label}</span>
					</a>
				{/each}
			</nav>
			<button class="logout" onclick={() => { logout(); goto('/login'); }}>
				Keluar
			</button>
		</aside>
	{/if}

	<main class="main" data-appscroll>
		{@render children()}

		{#if showChrome && !isDesktop}
			<nav class="bottom-nav">
				{#each bottomItems as it (it.href)}
					<a
						href={it.href}
						class="nav-item"
						class:active={isActive(it.href)}
					>
						<span class="nav-label">{it.label}</span>
					</a>
				{/each}
			</nav>
		{/if}
	</main>

	{#if $locked && $authValid && !isAuthPage}
		<PinLock />
	{/if}

	<Toasts />

	<div class="build-marker">Build: {__BUILD_TIME__}</div>

	<!-- Viewmode toggle (kecil, pojok kanan bawah, hanya di desktop untuk preview) -->
	{#if !isAuthPage && $authValid && !isImmersive}
		<div class="vm-toggle">
			<button
				class:active={$viewMode === 'phone'}
				onclick={() => viewMode.setMode('phone')}
			>
				Ponsel
			</button>
			<button
				class:active={$viewMode === 'desktop'}
				onclick={() => viewMode.setMode('desktop')}
			>
				Desktop
			</button>
		</div>
	{/if}
</div>

<style>
	.shell {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
	}

	.sidebar {
		width: 240px;
		flex-shrink: 0;
		background: var(--c-surface);
		border-right: 1px solid var(--c-border);
		padding: 20px 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px 16px;
		font-size: 16px;
		font-weight: 800;
	}

	.side-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.side-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 600;
		color: var(--c-text-muted);
	}

	.side-item:hover {
		background: var(--c-bg);
		color: var(--c-text);
	}

	.side-item.active {
		background: var(--c-primary-soft);
		color: var(--c-primary-dark);
	}

	.side-item .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.5;
	}

	.logout {
		margin-top: auto;
		padding: 10px;
		border: 1.5px solid var(--c-red-bg);
		background: var(--c-red-bg);
		color: var(--c-red);
		border-radius: 12px;
		font-size: 13.5px;
		font-weight: 700;
	}

	.main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		padding-bottom: 84px;
	}

	.shell.desktop .main {
		padding-bottom: 40px;
	}

	.shell.immersive .main {
		padding-bottom: 0;
		overflow: hidden;
	}

	.bottom-nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		background: var(--c-surface);
		border-top: 1px solid var(--c-border-light);
		padding: 8px 6px calc(14px + env(safe-area-inset-bottom, 8px));
		z-index: 100;
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 6px 0;
		color: var(--c-text-subtle);
	}

	.nav-item.active {
		color: var(--c-primary);
	}

	.nav-label {
		font-size: 11px;
		font-weight: 700;
	}

	.build-marker {
		position: fixed;
		right: 6px;
		bottom: 2px;
		font-size: 9px;
		color: var(--c-text-subtle);
		opacity: 0.55;
		pointer-events: none;
		z-index: 5;
	}

	.vm-toggle {
		position: fixed;
		bottom: 90px;
		right: 16px;
		display: none;
		background: var(--c-dark);
		border-radius: 20px;
		padding: 4px;
		gap: 2px;
		z-index: 200;
		box-shadow: 0 6px 24px rgba(15, 26, 20, 0.35);
	}

	@media (min-width: 768px) {
		.vm-toggle {
			display: flex;
		}
	}

	.vm-toggle button {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.55);
		font-size: 11px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 16px;
	}

	.vm-toggle button.active {
		background: var(--c-primary);
		color: #fff;
	}
</style>
