<script lang="ts">
	import { onMount } from 'svelte';
	import { isPengurus } from '$lib/auth';
	import { toast } from '$lib/ui';
	import { initialsOf } from '$lib/ui';
	import type { StatusWarga, Warga } from '$lib/types';
	import {
		listWarga,
		listStatus,
		updateWarga,
		waLink,
		BLOK_COLORS,
		AGAMA_LABEL
	} from '$lib/warga';
	import States from '$lib/components/States.svelte';
	import Modal from '$lib/components/Modal.svelte';

	const BLOK_LIST = ['Semua', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

	let wargaList = $state<Warga[]>([]);
	let statusList = $state<StatusWarga[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let filterBlok = $state('Semua');
	let expandedBloks = $state<Set<string>>(new Set(['A']));

	// Edit modal
	let editModal = $state<Warga | null>(null);
	let editForm = $state({
		no_rumah: '',
		no_wa: '',
		agama: 'islam',
		status: '',
		pengurus: false
	});
	let saving = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			const [w, s] = await Promise.all([listWarga(), listStatus()]);
			wargaList = w;
			statusList = s;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat data warga.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	// ── Derived ──
	const pengurusList = $derived(wargaList.filter((w) => w.pengurus));

	const filtered = $derived.by(() => {
		let list = wargaList;
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter((w) => {
				const nama = (w.expand?.user?.name || '').toLowerCase();
				const rumah = (w.no_rumah || '').toLowerCase();
				return nama.includes(q) || rumah.includes(q);
			});
		}
		if (filterBlok !== 'Semua') {
			list = list.filter((w) => (w.no_rumah || '').toUpperCase().startsWith(filterBlok));
		}
		return list;
	});

	const grouped = $derived.by(() => {
		const groups: Record<string, Warga[]> = {};
		for (const w of filtered) {
			const blok = ((w.no_rumah || '?')[0] || '?').toUpperCase();
			if (!groups[blok]) groups[blok] = [];
			groups[blok].push(w);
		}
		return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
	});

	function toggleBlok(blok: string) {
		const next = new Set(expandedBloks);
		if (next.has(blok)) next.delete(blok);
		else next.add(blok);
		expandedBloks = next;
	}

	function expandAll() {
		expandedBloks = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
	}

	function collapseAll() {
		expandedBloks = new Set();
	}

	function openEdit(w: Warga) {
		editForm = {
			no_rumah: w.no_rumah || '',
			no_wa: w.no_wa || '',
			agama: w.agama || 'islam',
			status: w.status || '',
			pengurus: !!w.pengurus
		};
		editModal = w;
	}

	async function handleSave() {
		if (!editModal) return;
		saving = true;
		try {
			const updateData: Partial<Warga> = {};
			if (editForm.no_rumah !== editModal.no_rumah)
				updateData.no_rumah = editForm.no_rumah.toUpperCase();
			if (editForm.no_wa !== editModal.no_wa) updateData.no_wa = editForm.no_wa;
			if (editForm.agama !== editModal.agama) updateData.agama = editForm.agama;
			if (editForm.status !== editModal.status) updateData.status = editForm.status;
			if (editForm.pengurus !== editModal.pengurus)
				updateData.pengurus = editForm.pengurus;

			if (Object.keys(updateData).length === 0) {
				editModal = null;
				return;
			}

			const updated = await updateWarga(editModal.id, updateData);
			wargaList = wargaList.map((w) =>
				w.id === updated.id ? { ...w, ...updated, expand: w.expand } : w
			);
			editModal = null;
			toast('Data warga berhasil diperbarui', 'ok');
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal memperbarui data.', 'err');
		} finally {
			saving = false;
		}
	}

	function getBlokColor(blok: string) {
		return BLOK_COLORS[blok] || { bg: '#EFF1F0', color: '#1B211E' };
	}
</script>

<!-- ══ Header hijau ══ -->
<header class="hd">
	<div class="hd-row">
		<div>
			<div class="lbl">Warga P2S</div>
			<h1>Data Warga</h1>
		</div>
		<div class="chips">
			<div class="stat">
				<div class="v">{wargaList.length}</div>
				<div class="k">Total</div>
			</div>
			<div class="stat">
				<div class="v gold">{pengurusList.length}</div>
				<div class="k">Pengurus</div>
			</div>
		</div>
	</div>
</header>

<div class="page-body">
	<!-- Search + filter blok -->
	<div class="filter-row">
		<div class="search">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="11" cy="11" r="7" stroke="#8A9991" stroke-width="1.8" />
				<path d="M20 20l-4-4" stroke="#8A9991" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<input
				type="text"
				placeholder="Cari nama atau no. rumah…"
				bind:value={search}
			/>
		</div>
		<select bind:value={filterBlok} class="blok">
			{#each BLOK_LIST as b (b)}
				<option value={b}>Blok {b}</option>
			{/each}
		</select>
	</div>

	{#if loading}
		<States kind="loading" rows={6} />
	{:else if error}
		<States kind="error" text={error} onRetry={load} />
	{:else if filtered.length === 0}
		<States
			kind="empty"
			title="Tidak ditemukan"
			text={search
				? `Tidak ada warga yang cocok dengan "${search}".`
				: 'Belum ada data warga.'}
		/>
	{:else}
		<div class="expand-btns">
			<button class="exp-btn primary" onclick={expandAll}>Buka Semua</button>
			<button class="exp-btn" onclick={collapseAll}>Tutup Semua</button>
		</div>

		{#each grouped as [blok, wargas] (blok)}
			{@const c = getBlokColor(blok)}
			{@const open = expandedBloks.has(blok)}
			<div class="blok-group">
				<button class="blok-head" onclick={() => toggleBlok(blok)}>
					<span
						class="blok-chip"
						style="background:{c.bg}; color:{c.color}"
					>
						Blok {blok}
					</span>
					<span class="blok-count">{wargas.length} warga</span>
					<span class="chev" class:open>▼</span>
				</button>

				{#if open}
					<div class="warga-list">
						{#each wargas as w (w.id)}
							{@const name = w.expand?.user?.name || 'Tanpa Nama'}
							{@const statusNama = w.expand?.status?.nama}
							<div class="warga-item card" style="border-left-color: {c.color}">
								<div class="wava" style="background:{c.bg}; color:{c.color}">
									{initialsOf(name)}
								</div>
								<div class="wbody">
									<div class="wtop">
										<span class="chip" style="background:{c.bg}; color:{c.color}">
											{w.no_rumah || '-'}
										</span>
										{#if w.pengurus}
											<span class="chip peng">⭐ Pengurus</span>
										{/if}
									</div>
									<div class="wname">{name}</div>
									<div class="wmeta">
										{#if w.no_wa}
											<a
												class="wa"
												href={waLink(w.no_wa)}
												target="_blank"
												rel="noopener noreferrer"
											>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366">
													<path
														d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
													/>
												</svg>
												{w.no_wa}
											</a>
										{/if}
										{#if w.agama}
											<span class="agama">{AGAMA_LABEL[w.agama] || w.agama}</span>
										{/if}
										{#if statusNama}
											<span class="stat-chip">{statusNama}</span>
										{/if}
									</div>
								</div>
								{#if $isPengurus}
									<button
										class="edit-btn"
										onclick={() => openEdit(w)}
										aria-label="Edit warga"
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
											<path
												d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"
												stroke="#6B7B72"
												stroke-width="1.8"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<!-- ══ Modal edit ══ -->
<Modal
	open={editModal !== null}
	title="Edit Data Warga"
	onClose={() => (editModal = null)}
>
	{#if editModal}
		<div class="edit-info">
			<div class="ei-badge">{editModal.no_rumah || '-'}</div>
			<div class="ei-name">
				{editModal.expand?.user?.name || 'Tanpa Nama'}
			</div>
			{#if editModal.pengurus}
				<span class="chip peng">Pengurus</span>
			{/if}
		</div>

		<div class="f-group">
			<label class="f-field">
				<span class="f-label">No. Rumah</span>
				<input
					class="f-input"
					type="text"
					bind:value={editForm.no_rumah}
					oninput={(e) => {
						editForm.no_rumah = (e.currentTarget as HTMLInputElement).value.toUpperCase();
					}}
					maxlength="5"
					placeholder="A01"
				/>
			</label>

			<label class="f-field">
				<span class="f-label">No. WhatsApp</span>
				<input
					class="f-input"
					type="text"
					bind:value={editForm.no_wa}
					oninput={(e) => {
						editForm.no_wa = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '');
					}}
					placeholder="0812xxxxxxxx"
				/>
			</label>

			<label class="f-field">
				<span class="f-label">Agama</span>
				<select class="f-select" bind:value={editForm.agama}>
					{#each Object.entries(AGAMA_LABEL) as [val, label] (val)}
						<option value={val}>{label}</option>
					{/each}
				</select>
			</label>

			{#if statusList.length > 0}
				<label class="f-field">
					<span class="f-label">Status Warga</span>
					<select class="f-select" bind:value={editForm.status}>
						<option value="">-- Pilih Status --</option>
						{#each statusList as s (s.id)}
							<option value={s.id}>
								{s.nama}{s.jumlah_iuran
									? ` (Rp ${s.jumlah_iuran.toLocaleString('id-ID')})`
									: ''}
							</option>
						{/each}
					</select>
				</label>
			{/if}

			<div class="pengurus-toggle">
				<span class="f-label" style="margin: 0">Pengurus</span>
				<label class="switch">
					<input type="checkbox" bind:checked={editForm.pengurus} />
					<span class="slider"></span>
				</label>
			</div>
		</div>

		<div class="modal-actions" style="margin-top: 18px">
			<button
				class="btn btn-outline"
				onclick={() => (editModal = null)}
				disabled={saving}
			>
				Batal
			</button>
			<button class="btn btn-primary" onclick={handleSave} disabled={saving}>
				{saving ? 'Menyimpan…' : 'Simpan'}
			</button>
		</div>
	{/if}
</Modal>

<style>
	/* ── Header hijau ── */
	.hd {
		background: var(--c-primary-gradient);
		padding: 22px 18px 40px;
		border-bottom-left-radius: 28px;
		border-bottom-right-radius: 28px;
	}

	.hd-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}

	.lbl {
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
		font-weight: 500;
	}

	h1 {
		color: #fff;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-top: 2px;
	}

	.chips {
		display: flex;
		gap: 8px;
	}

	.stat {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 8px 14px;
		text-align: center;
		backdrop-filter: blur(4px);
	}

	.stat .v {
		color: #fff;
		font-size: 20px;
		font-weight: 800;
		line-height: 1.1;
	}

	.stat .v.gold {
		color: #ffd54f;
	}

	.stat .k {
		color: rgba(255, 255, 255, 0.7);
		font-size: 10px;
		font-weight: 600;
	}

	.page-body {
		padding: 18px 20px 40px;
		margin-top: -24px;
	}

	/* ── Filter row ── */
	.filter-row {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.search {
		flex: 1;
		position: relative;
	}

	.search svg {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.search input {
		width: 100%;
		height: 46px;
		padding: 0 14px 0 40px;
		border-radius: 14px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		color: var(--c-text);
		outline: none;
	}

	.search input:focus {
		border-color: var(--c-primary);
	}

	.blok {
		height: 46px;
		padding: 0 32px 0 14px;
		border-radius: 14px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		font-size: 14px;
		font-weight: 600;
		font-family: inherit;
		color: var(--c-text);
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A9991' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
	}

	.expand-btns {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
	}

	.exp-btn {
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		border-radius: 10px;
		padding: 5px 14px;
		font-size: 11px;
		font-weight: 700;
		color: var(--c-text-muted);
		font-family: inherit;
	}

	.exp-btn.primary {
		color: var(--c-primary);
	}

	/* ── Blok group ── */
	.blok-group {
		margin-bottom: 16px;
	}

	.blok-head {
		display: flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: none;
		padding: 6px 4px;
		width: 100%;
		font-family: inherit;
		cursor: pointer;
	}

	.blok-chip {
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.blok-count {
		font-size: 12px;
		color: var(--c-text-light);
		font-weight: 600;
	}

	.chev {
		margin-left: auto;
		color: var(--c-text-light);
		font-size: 13px;
		transition: transform 0.2s;
	}

	.chev.open {
		transform: rotate(180deg);
	}

	.warga-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.warga-item {
		padding: 14px 16px;
		border-left: 4px solid var(--c-border);
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.wava {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 14px;
		flex-shrink: 0;
	}

	.wbody {
		flex: 1;
		min-width: 0;
	}

	.wtop {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.wtop .chip {
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		height: auto;
		line-height: 1.4;
	}

	.wtop .chip.peng {
		background: #fbf1dd;
		color: #c8821a;
		font-size: 10px;
		letter-spacing: 0.02em;
	}

	.wname {
		font-size: 14px;
		font-weight: 700;
		color: var(--c-text);
		margin-top: 3px;
	}

	.wmeta {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 4px;
		flex-wrap: wrap;
	}

	.wa {
		font-size: 11px;
		color: #25d366;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		text-decoration: none;
		font-weight: 600;
	}

	.wa:hover {
		color: #128c7e;
	}

	.wa:hover svg {
		fill: #128c7e;
	}

	.agama {
		font-size: 11px;
		color: var(--c-text-light);
	}

	.stat-chip {
		background: #eef1ef;
		color: var(--c-text-muted);
		padding: 1px 8px;
		border-radius: 10px;
		font-size: 10px;
		font-weight: 600;
	}

	.edit-btn {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* ── Edit modal ── */
	.edit-info {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--c-bg);
		border-radius: 12px;
		padding: 12px 14px;
		margin-bottom: 20px;
	}

	.ei-badge {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--c-primary);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 14px;
		flex-shrink: 0;
	}

	.ei-name {
		flex: 1;
		font-size: 14px;
		font-weight: 700;
	}

	.chip.peng {
		background: #fbf1dd;
		color: #c8821a;
	}

	.f-field {
		display: block;
	}

	.pengurus-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 0;
	}

	.switch {
		position: relative;
		width: 44px;
		height: 24px;
		display: inline-block;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		inset: 0;
		background: var(--c-border);
		border-radius: 999px;
		transition: background 0.15s;
	}

	.slider::before {
		content: '';
		position: absolute;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		top: 3px;
		left: 3px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.15s;
	}

	.switch input:checked + .slider {
		background: var(--c-primary);
	}

	.switch input:checked + .slider::before {
		transform: translateX(20px);
	}

	.modal-actions {
		display: flex;
		gap: 10px;
	}

	.modal-actions .btn {
		flex: 1;
		height: 44px;
	}
</style>
