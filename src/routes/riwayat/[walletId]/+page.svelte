<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Ledger, Wallet } from '$lib/types';
	import {
		getWalletById,
		listLedgersForWallet,
		txVisual,
		extractWargaCode,
		cleanNote,
		fmtSaldo
	} from '$lib/riwayat';
	import States from '$lib/components/States.svelte';

	type WaktuKey = '7' | '30' | '90' | 'all';
	type TipeKey = 'all' | 'masuk' | 'keluar';

	const walletId = $derived($page.params.walletId);

	let wallet = $state<Wallet | null>(null);
	let ledgers = $state<Ledger[]>([]);
	let loading = $state(true);
	let error = $state('');
	let expandedId = $state<string | null>(null);

	let filterWaktu = $state<WaktuKey>('all');
	let filterTipe = $state<TipeKey>('all');

	const WAKTU: { key: WaktuKey; label: string }[] = [
		{ key: '7', label: '7 Hari' },
		{ key: '30', label: '30 Hari' },
		{ key: '90', label: '3 Bulan' },
		{ key: 'all', label: 'Semua' }
	];

	const TIPE: { key: TipeKey; label: string }[] = [
		{ key: 'all', label: 'Semua' },
		{ key: 'masuk', label: 'Masuk' },
		{ key: 'keluar', label: 'Keluar' }
	];

	async function load(id: string) {
		loading = true;
		error = '';
		try {
			const [w, l] = await Promise.all([
				getWalletById(id),
				listLedgersForWallet(id)
			]);
			wallet = w;
			ledgers = l;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat riwayat.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (walletId) void load(walletId);
	});

	// Reload kalau walletId berubah (SPA navigation)
	$effect(() => {
		if (walletId) void load(walletId);
	});

	const filtered = $derived.by(() => {
		let list = ledgers;
		// Tipe (Masuk/Keluar)
		if (filterTipe === 'masuk') list = list.filter((l) => l.entry_type === 'CREDIT');
		else if (filterTipe === 'keluar') list = list.filter((l) => l.entry_type === 'DEBIT');

		// Waktu (client-side)
		if (filterWaktu !== 'all') {
			const days = Number(filterWaktu);
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - days);
			list = list.filter((l) => {
				const tx = l.expand?.transaction;
				const ref = tx?.created || l.created;
				if (!ref) return true;
				return new Date(ref) >= cutoff;
			});
		}
		return list;
	});

	function fmtDateTime(v?: string): string {
		if (!v) return '';
		return new Date(v).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function statusColor(status?: string): string {
		if (status === 'SUCCESS') return 'var(--c-primary)';
		if (status === 'PENDING') return '#E68A2E';
		return 'var(--c-red)';
	}
</script>

<div class="page-riwayat">
	<!-- Header dengan back -->
	<header class="bar">
		<button class="back" onclick={() => history.back()} aria-label="Kembali">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
				<path
					d="M19 12H5M5 12l7-7M5 12l7 7"
					stroke="#0F1A14"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<h1>Riwayat Transaksi</h1>
	</header>

	<!-- Wallet info card -->
	{#if wallet}
		<div
			class="wallet-card"
			class:kas={wallet.wallet_type === 'KAS'}
			class:pribadi={wallet.wallet_type !== 'KAS'}
		>
			<div class="wc-top">
				<div>
					<div class="wc-t">
						{#if wallet.wallet_type === 'KAS'}
							💰 {wallet.note || 'Saldo Kas Warga'}
						{:else}
							💳 Saldo Dompet Pribadi
						{/if}
					</div>
					{#if wallet.expand?.user?.name}
						<div class="wc-s">{wallet.expand.user.name}</div>
					{/if}
					{#if wallet.wallet_type === 'KAS' && wallet.note}
						<div class="wc-note">{wallet.note}</div>
					{/if}
				</div>
				<span class="wc-badge">{wallet.wallet_type}</span>
			</div>
			<div class="wc-amount">{fmtSaldo(wallet.balance)}</div>
			<div class="wc-hint">{ledgers.length} transaksi tercatat</div>
		</div>
	{/if}

	<!-- Filter waktu -->
	<div class="pills scroll">
		{#each WAKTU as f (f.key)}
			<button
				class="pill"
				class:on={filterWaktu === f.key}
				onclick={() => (filterWaktu = f.key)}
			>
				{f.label}
			</button>
		{/each}
	</div>

	<!-- Filter tipe -->
	<div class="pills equal">
		{#each TIPE as f (f.key)}
			<button
				class="pill flex"
				class:on={filterTipe === f.key}
				onclick={() => (filterTipe = f.key)}
			>
				{f.label}
			</button>
		{/each}
	</div>

	<!-- List -->
	<div class="list-wrap">
		{#if loading}
			<States kind="loading" rows={6} />
		{:else if error}
			<States kind="error" text={error} onRetry={() => walletId && load(walletId)} />
		{:else if filtered.length === 0}
			<States
				kind="empty"
				title="Belum ada transaksi"
				text={filterTipe !== 'all' || filterWaktu !== 'all'
					? 'Coba ubah filter waktu / tipe.'
					: ''}
			/>
		{:else}
			<div class="ledger-list">
				{#each filtered as l (l.id)}
					{@const tx = l.expand?.transaction}
					{@const info = txVisual(tx?.type, l.entry_type)}
					{@const isOpen = expandedId === l.id}
					{@const wargaCode = extractWargaCode(tx?.note)}
					{@const noteText = cleanNote(tx?.note)}
					{@const timestamp = l.created || tx?.created}
					<button
						type="button"
						class="entry card"
						class:open={isOpen}
						onclick={() => (expandedId = isOpen ? null : l.id)}
					>
						<div class="entry-head">
							<div class="entry-left">
								<span class="emo">{info.icon}</span>
								<div class="entry-mid">
									<div class="titles">
										<span class="ttype">{tx?.type || 'Transaksi'}</span>
										<span
											class="badge"
											class:cred={l.entry_type === 'CREDIT'}
											class:deb={l.entry_type === 'DEBIT'}
										>
											{info.label}
										</span>
									</div>
									{#if tx?.note}
										<div class="note">
											{#if wargaCode}
												<span class="warga-code">{wargaCode}</span>
												{' · '}
											{/if}
											{noteText}
										</div>
									{/if}
									<div class="ts">{fmtDateTime(timestamp)}</div>
								</div>
							</div>
							<div class="entry-right">
								<div
									class="amt"
									class:credit={l.entry_type === 'CREDIT'}
									class:debit={l.entry_type === 'DEBIT'}
								>
									{l.entry_type === 'CREDIT' ? '+' : '-'}{fmtSaldo(l.amount)}
								</div>
								<div class="bal">{fmtSaldo(l.balance_after)}</div>
							</div>
						</div>

						{#if isOpen}
							<div class="detail">
								<div class="grid">
									{#if tx?.expand?.created_by?.name}
										<span class="k">Approved By:</span>
										<span class="v strong">
											{tx.expand.created_by.name}
										</span>
									{/if}
									<span class="k">Referensi:</span>
									<span class="v">{tx?.reference_no || '-'}</span>
									<span class="k">Status:</span>
									<span class="v" style:color={statusColor(tx?.status)}>
										{tx?.status || '-'}
									</span>
									<span class="k">Saldo Sebelum:</span>
									<span class="v">{fmtSaldo(l.balance_before)}</span>
									<span class="k">Saldo Sesudah:</span>
									<span class="v">{fmtSaldo(l.balance_after)}</span>
									{#if tx?.amount && tx.amount > 0}
										<span class="k">Jumlah:</span>
										<span
											class="v"
											class:credit={l.entry_type === 'CREDIT'}
											class:debit={l.entry_type === 'DEBIT'}
										>
											{l.entry_type === 'CREDIT' ? '+' : '-'}{fmtSaldo(tx.amount)}
										</span>
										{#if tx.fee && tx.fee > 0}
											<span class="k">Biaya:</span>
											<span class="v">{fmtSaldo(tx.fee)}</span>
										{/if}
										{#if tx.net_amount !== undefined}
											<span class="k">Bersih:</span>
											<span class="v">{fmtSaldo(tx.net_amount)}</span>
										{/if}
									{/if}
									{#if tx?.note}
										<span class="k">Catatan:</span>
										<span class="v">{tx.note}</span>
									{/if}
								</div>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.page-riwayat {
		padding: 0 0 40px;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px 0;
	}

	.back {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		display: flex;
	}

	h1 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	/* ── Wallet card ── */
	.wallet-card {
		margin: 16px 20px 0;
		border-radius: 16px;
		padding: 20px;
		color: #fff;
	}

	.wallet-card.kas {
		background: linear-gradient(145deg, #147a4a, #0c6b40);
	}

	.wallet-card.pribadi {
		background: linear-gradient(145deg, #2563eb, #1d4ed8);
	}

	.wc-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 10px;
	}

	.wc-t {
		font-size: 13px;
		font-weight: 700;
		opacity: 0.9;
	}

	.wc-s {
		font-size: 12px;
		opacity: 0.75;
		margin-top: 2px;
	}

	.wc-note {
		font-size: 11px;
		opacity: 0.65;
		margin-top: 1px;
	}

	.wc-badge {
		font-size: 11px;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.18);
		padding: 4px 10px;
		border-radius: 8px;
		white-space: nowrap;
	}

	.wc-amount {
		font-size: 28px;
		font-weight: 800;
		margin-top: 10px;
		font-family: var(--mono);
		letter-spacing: -0.02em;
	}

	.wc-hint {
		font-size: 11px;
		opacity: 0.7;
		margin-top: 4px;
	}

	/* ── Pills ── */
	.pills {
		display: flex;
		gap: 8px;
		padding: 0 20px;
	}

	.pills.scroll {
		margin-top: 20px;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: none;
	}

	.pills.scroll::-webkit-scrollbar {
		display: none;
	}

	.pills.equal {
		margin-top: 10px;
	}

	.pill {
		flex: none;
		background: var(--c-surface);
		border: 1.5px solid var(--c-border);
		color: var(--c-text-muted);
		padding: 8px 14px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		font-family: inherit;
		white-space: nowrap;
		cursor: pointer;
	}

	.pill.flex {
		flex: 1;
		border-radius: 10px;
	}

	.pill.on {
		background: var(--c-primary-soft);
		border-color: var(--c-primary);
		color: var(--c-primary-dark);
		font-weight: 700;
	}

	/* ── Ledger list ── */
	.list-wrap {
		margin-top: 16px;
		padding: 0 20px;
	}

	.ledger-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.entry {
		width: 100%;
		text-align: left;
		background: var(--c-surface);
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-card);
		padding: 14px;
		font-family: inherit;
		cursor: pointer;
	}

	.entry.open {
		border-color: var(--c-primary);
	}

	.entry-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	.entry-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}

	.emo {
		font-size: 22px;
		flex: none;
	}

	.entry-mid {
		flex: 1;
		min-width: 0;
	}

	.titles {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.ttype {
		font-weight: 700;
		font-size: 13px;
		color: var(--c-text);
	}

	.badge {
		font-size: 10px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.badge.cred {
		background: var(--c-primary-soft);
		color: var(--c-primary);
	}

	.badge.deb {
		background: #fff5f4;
		color: var(--c-red);
	}

	.note {
		font-size: 11px;
		color: var(--c-text-muted);
		margin-top: 2px;
		word-break: break-word;
	}

	.warga-code {
		font-weight: 800;
		color: var(--c-text);
	}

	.ts {
		font-size: 10px;
		color: var(--c-text-subtle);
		margin-top: 2px;
	}

	.entry-right {
		text-align: right;
		flex-shrink: 0;
	}

	.amt {
		font-weight: 800;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}

	.amt.credit,
	.v.credit {
		color: var(--c-primary);
	}

	.amt.debit,
	.v.debit {
		color: var(--c-red);
	}

	.bal {
		font-size: 10px;
		color: var(--c-text-subtle);
		margin-top: 1px;
	}

	/* ── Detail ── */
	.detail {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--c-border);
	}

	.grid {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 6px 16px;
		font-size: 12px;
	}

	.k {
		color: var(--c-text-muted);
	}

	.v {
		font-weight: 600;
		text-align: left;
		word-break: break-word;
	}

	.v.strong {
		font-weight: 700;
		color: var(--c-text);
	}
</style>
