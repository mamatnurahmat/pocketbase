<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pb';
	import { isScurity } from '$lib/auth';
	import { toast } from '$lib/ui';
	import type { Warga } from '$lib/types';
	import { getMyWarga } from '$lib/dashboard';
	import { submitLaporWarga, submitLaporScurity } from '$lib/lapor';

	let warga = $state<Warga | null>(null);
	let jenis = $state('');
	let keterangan = $state('');
	let foto = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let loading = $state(false);

	onMount(async () => {
		const uid = pb.authStore.record?.id;
		if (uid) {
			try {
				warga = await getMyWarga(uid);
			} catch (e) {
				console.warn('warga not found:', e);
			}
		}
	});

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		foto = file;
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
	}

	function clearFoto() {
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		foto = null;
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (!foto) {
			toast('Mohon sertakan foto laporan.', 'err');
			return;
		}
		if ($isScurity) {
			if (!jenis) {
				toast('Pilih jenis laporan.', 'err');
				return;
			}
			if (jenis === 'lainnya' && !keterangan.trim()) {
				toast('Isi keterangan laporan.', 'err');
				return;
			}
		} else {
			if (!keterangan.trim()) {
				toast('Isi keterangan laporan.', 'err');
				return;
			}
		}

		loading = true;
		try {
			if ($isScurity) {
				const uid = pb.authStore.record?.id;
				if (!uid) throw new Error('Sesi tidak valid.');
				const ketFinal = jenis === 'lainnya' ? keterangan : jenis;
				await submitLaporScurity(uid, jenis, ketFinal, foto);
			} else {
				if (!warga) throw new Error('Data warga tidak ditemukan.');
				await submitLaporWarga(warga, keterangan, foto);
			}
			toast('Laporan berhasil dikirim!', 'ok');
			jenis = '';
			keterangan = '';
			clearFoto();
			setTimeout(() => goto('/dashboard'), 900);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Gagal mengirim laporan.', 'err');
		} finally {
			loading = false;
		}
	}
</script>

<!-- Green header -->
<header class="hd">
	<div class="hd-row">
		<div>
			<div class="lbl">Warga P2S</div>
			<h1>Lapor</h1>
		</div>
		<div class="ava">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path
					d="M4 14V6C4 4.9 4.9 4 6 4H18C19.1 4 20 4.9 20 6V14C20 15.1 19.1 16 18 16H8L4 20V14Z"
					stroke="#fff"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<circle cx="12" cy="10" r="1" fill="#fff" />
			</svg>
		</div>
	</div>
</header>

<div class="page-body">
	<div class="card form-card">
		<h2>Form Laporan</h2>
		<p class="sub">Sampaikan keluhan atau informasi. Sertakan foto yang jelas.</p>

		<form onsubmit={submit} class="form">
			<div class="field">
				<span class="f-label">Foto (Kamera / Galeri)</span>
				<div class="drop" class:has={preview}>
					{#if preview}
						<img src={preview} alt="Preview" />
						<button
							type="button"
							class="rm"
							onclick={clearFoto}
							aria-label="Hapus foto"
						>
							✕
						</button>
					{:else}
						<div class="drop-hint">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
								<path
									d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
									stroke="#94A3B8"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<circle cx="12" cy="13" r="4" stroke="#94A3B8" stroke-width="2" />
							</svg>
							<span>Ketuk untuk Ambil Foto</span>
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						capture="environment"
						onchange={onFileChange}
					/>
				</div>
			</div>

			{#if $isScurity}
				<div class="field">
					<span class="f-label">Jenis Laporan</span>
					<select
						class="f-select"
						bind:value={jenis}
						onchange={() => (keterangan = '')}
						required
					>
						<option value="">-- Pilih --</option>
						<option value="absen">Absen</option>
						<option value="patroli">Patroli</option>
						<option value="lainnya">Lainnya</option>
					</select>
				</div>
				{#if jenis === 'lainnya'}
					<div class="field">
						<span class="f-label">Keterangan</span>
						<textarea
							class="f-textarea"
							bind:value={keterangan}
							placeholder="Deskripsikan laporan Anda di sini…"
							required
						></textarea>
					</div>
				{/if}
			{:else}
				<div class="field">
					<span class="f-label">Keterangan Laporan</span>
					<textarea
						class="f-textarea"
						bind:value={keterangan}
						placeholder="Deskripsikan laporan Anda di sini…"
						required
					></textarea>
				</div>
			{/if}

			<button
				type="submit"
				class="btn btn-primary"
				disabled={loading || !foto || ($isScurity ? !jenis : !keterangan.trim())}
			>
				{loading ? 'Mengirim…' : 'Kirim Laporan'}
			</button>
		</form>
	</div>
</div>

<style>
	.hd {
		background: var(--c-primary-gradient);
		padding: 22px 18px 40px;
		border-bottom-left-radius: 28px;
		border-bottom-right-radius: 28px;
	}

	.hd-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.lbl {
		color: rgba(255, 255, 255, 0.7);
		font-size: 13px;
		font-weight: 500;
	}

	h1 {
		color: #fff;
		font-size: 18px;
		font-weight: 700;
	}

	.ava {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.page-body {
		padding: 0 20px 40px;
		margin-top: -20px;
	}

	.form-card {
		padding: 24px 20px;
	}

	.form-card h2 {
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.sub {
		font-size: 13px;
		color: var(--c-text-muted);
		line-height: 1.5;
		margin-bottom: 20px;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.field {
		display: flex;
		flex-direction: column;
	}

	.f-label {
		display: block;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--c-text-muted);
		margin-bottom: 7px;
	}

	.drop {
		border: 2px dashed #e2e8f0;
		border-radius: 12px;
		padding: 30px;
		text-align: center;
		background: #f8fafc;
		position: relative;
		overflow: hidden;
	}

	.drop.has {
		padding: 8px;
	}

	.drop img {
		width: 100%;
		border-radius: 8px;
		max-height: 300px;
		object-fit: cover;
	}

	.drop-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.drop-hint span {
		font-size: 14px;
		color: #475569;
		font-weight: 500;
	}

	.drop input[type='file'] {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.drop.has input[type='file'] {
		display: none;
	}

	.rm {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		color: #fff;
		border-radius: 50%;
		width: 30px;
		height: 30px;
	}
</style>
