import { useState, useEffect, useMemo, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
// ── Toast ──
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === 'success' ? '#15935A' : type === 'error' ? '#C24A4A' : '#1B211E';
  return (
    <div style={{
      position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, background: bg, color: '#fff',
      padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      maxWidth: 360, width: 'calc(100% - 40px)',
      textAlign: 'center', animation: 'fadeIn 0.2s ease',
    }}>
      {message}
    </div>
  );
}

// ── Blok color mapping ──
const blokColors = {
  A: { bg: '#E8F5EE', color: '#15935A' },
  B: { bg: '#E3F2FD', color: '#1976D2' },
  C: { bg: '#FFF3E0', color: '#E65100' },
  D: { bg: '#F3E5F5', color: '#7B1FA2' },
  E: { bg: '#FCE4EC', color: '#C62828' },
  F: { bg: '#E0F7FA', color: '#00695C' },
  G: { bg: '#F9FBE7', color: '#827717' },
};

const agamaLabels = {
  islam: 'Islam',
  katolik: 'Katolik',
  protestan: 'Protestan',
  hindu: 'Hindu',
  budha: 'Budha',
  konghucu: 'Konghucu',
};

export default function Warga() {
  const [wargaList, setWargaList] = useState([]);
  const [pengurusList, setPengurusList] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBlok, setFilterBlok] = useState('Semua');
  const [isPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');

  // Edit modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedBloks, setExpandedBloks] = useState(() => new Set(['A']));
  const [toast, setToast] = useState(null);

  const blokList = ['Semua', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [warga, statuses] = await Promise.all([
          pb.collection('warga').getFullList({
            expand: 'user,status',
            sort: 'no_rumah',
          }),
          pb.collection('status').getFullList({ sort: 'nama' }),
        ]);
        const pengurus = warga.filter(w => w.pengurus);
        setWargaList(warga);
        setPengurusList(pengurus);
        setStatusList(statuses);
      } catch (e) {
        console.error('Gagal fetch data warga:', e);
      } finally {
        setLoading(false);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  // ── Filtered & grouped ──
  const filtered = useMemo(() => {
    let list = wargaList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w => {
        const nama = (w.expand?.user?.name || '').toLowerCase();
        const rumah = (w.no_rumah || '').toLowerCase();
        return nama.includes(q) || rumah.includes(q);
      });
    }
    if (filterBlok !== 'Semua') {
      list = list.filter(w => (w.no_rumah || '').toUpperCase().startsWith(filterBlok));
    }
    return list;
  }, [wargaList, search, filterBlok]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const w of filtered) {
      const blok = (w.no_rumah || '?')[0].toUpperCase();
      if (!groups[blok]) groups[blok] = [];
      groups[blok].push(w);
    }
    // Sort groups by blok
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ── Open edit modal ──
  const openEdit = useCallback((warga) => {
    setEditModal(warga);
    setEditForm({
      no_rumah: warga.no_rumah || '',
      no_wa: warga.no_wa || '',
      agama: warga.agama || 'islam',
      status: warga.status || '',
      pengurus: warga.pengurus || false,
    });
  }, []);

  // ── Save edit ──
  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const updateData = {};
      if (editForm.no_rumah !== editModal.no_rumah) updateData.no_rumah = editForm.no_rumah.toUpperCase();
      if (editForm.no_wa !== editModal.no_wa) updateData.no_wa = editForm.no_wa;
      if (editForm.agama !== editModal.agama) updateData.agama = editForm.agama;
      if (editForm.status !== editModal.status) updateData.status = editForm.status;
      if (editForm.pengurus !== editModal.pengurus) updateData.pengurus = editForm.pengurus;

      if (Object.keys(updateData).length === 0) {
        setEditModal(null);
        return;
      }

      const updated = await pb.collection('warga').update(editModal.id, updateData);
      setWargaList(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated, expand: prev.find(p => p.id === updated.id)?.expand } : w));
      setEditModal(null);
      setToast({ message: 'Data warga berhasil diperbarui ✓', type: 'success' });
    } catch (err) {
      console.error('Gagal update warga:', err);
      setToast({ message: 'Gagal memperbarui data warga.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleBlok = (blok) => {
    setExpandedBloks(prev => {
      const next = new Set(prev);
      if (next.has(blok)) next.delete(blok);
      else next.add(blok);
      return next;
    });
  };

  const expandAll = () => setExpandedBloks(new Set(['A','B','C','D','E','F','G']));
  const collapseAll = () => setExpandedBloks(new Set());

  // ── Get initials ──
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="page-padded" style={{ paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Data Warga</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              padding: '8px 14px', textAlign: 'center', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{wargaList.length}</div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10, fontWeight: 600 }}>Total</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              padding: '8px 14px', textAlign: 'center', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ color: '#FFD54F', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{pengurusList.length}</div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10, fontWeight: 600 }}>Pengurus</div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -24 }}>
        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="7" stroke="#8A9991" strokeWidth="1.8" />
              <path d="M20 20l-4-4" stroke="#8A9991" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama atau no. rumah..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', height: 46, padding: '0 14px 0 40px',
                borderRadius: 14, border: '1.5px solid #E6EBE7', background: '#fff',
                fontSize: 14, fontWeight: 500, fontFamily: 'inherit', color: '#1B211E',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#15935A'}
              onBlur={e => e.target.style.borderColor = '#E6EBE7'}
            />
          </div>
          <select
            value={filterBlok}
            onChange={e => setFilterBlok(e.target.value)}
            style={{
              height: 46, padding: '0 32px 0 14px',
              borderRadius: 14, border: '1.5px solid #E6EBE7', background: '#fff',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#1B211E',
              cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A9991' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}
          >
            {blokList.map(b => (
              <option key={b} value={b}>Blok {b}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #E6EBE7', borderTopColor: '#15935A',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#8A9991', fontWeight: 600 }}>Memuat data warga...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, padding: '48px 20px', color: '#8A9991', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: '#EFF1F0', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 4,
            }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1B211E' }}>
              Tidak Ditemukan
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
              Tidak ada warga yang cocok dengan pencarian &ldquo;{search}&rdquo;.
            </div>
          </div>
        )}

        {/* Warga list grouped by blok */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button onClick={expandAll} style={{
              border: '1.5px solid #E6EBE7', background: '#fff', borderRadius: 10,
              padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#15935A',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Buka Semua</button>
            <button onClick={collapseAll} style={{
              border: '1.5px solid #E6EBE7', background: '#fff', borderRadius: 10,
              padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#6B7B72',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Tutup Semua</button>
          </div>
        )}
        {!loading && grouped.map(([blok, wargas]) => {
          const c = blokColors[blok] || { bg: '#EFF1F0', color: '#1B211E' };
          return (
            <div key={blok} style={{ marginBottom: 16 }}>
              <div
                onClick={() => toggleBlok(blok)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  cursor: 'pointer', userSelect: 'none',
                  padding: '6px 4px', borderRadius: 10,
                }}
              >
                <span style={{
                  background: c.bg, color: c.color,
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
                }}>
                  Blok {blok}
                </span>
                <span style={{ fontSize: 12, color: '#8A9991', fontWeight: 600 }}>
                  {wargas.length} warga
                </span>
                <span style={{ marginLeft: 'auto', color: '#8A9991', fontSize: 13, transition: 'transform 0.2s', transform: expandedBloks.has(blok) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </div>
              {expandedBloks.has(blok) && (
              <div className="flex-col gap-sm">
                {wargas.map(w => {
                  const name = w.expand?.user?.name || 'Tanpa Nama';
                  const statusNama = w.expand?.status?.nama;
                  const blokCfg = blokColors[blok] || { bg: '#EFF1F0', color: '#1B211E' };
                  return (
                    <div
                      key={w.id}
                      className="card"
                      style={{
                        padding: '14px 16px',
                        borderLeft: `4px solid ${blokCfg.color}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: blokCfg.bg, color: blokCfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14, flexShrink: 0,
                      }}>
                        {getInitials(name)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            background: blokCfg.bg, color: blokCfg.color,
                            padding: '2px 8px', borderRadius: 6,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {w.no_rumah}
                          </span>
                          {w.pengurus && (
                            <span style={{
                              background: '#FBF1DD', color: '#C8821A',
                              padding: '2px 8px', borderRadius: 6,
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                            }}>
                              ⭐ Pengurus
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1B211E', marginTop: 3 }}>
                          {name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          {w.no_wa && (
                            <a
                              href={`https://wa.me/${w.no_wa.startsWith('0') ? '62' + w.no_wa.slice(1) : w.no_wa.startsWith('62') ? w.no_wa : '62' + w.no_wa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="wa-link"
                              style={{ fontSize: 11, color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              {w.no_wa}
                            </a>
                          )}
                          {w.agama && (
                            <span style={{ fontSize: 11, color: '#8A9991' }}>
                              {agamaLabels[w.agama] || w.agama}
                            </span>
                          )}
                          {statusNama && (
                            <span style={{
                              background: '#EEF1EF', color: '#6B7B72',
                              padding: '1px 8px', borderRadius: 10,
                              fontSize: 10, fontWeight: 600,
                            }}>
                              {statusNama}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit button (pengurus only) */}
                      {isPengurus && (
                        <button
                          onClick={() => openEdit(w)}
                          style={{
                            width: 38, height: 38, borderRadius: 10,
                            border: '1.5px solid #E6EBE7', background: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0,
                            transition: 'all 0.15s',
                          }}
                          onPointerDown={e => e.currentTarget.style.background = '#F0F4F1'}
                          onPointerUp={e => e.currentTarget.style.background = '#fff'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="#6B7B72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── EDIT BOTTOM SHEET ── */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => !saving && setEditModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Edit Data Warga</h3>
              <button
                className="close-btn"
                onClick={() => setEditModal(null)}
                disabled={saving}
                style={{ minHeight: 44, minWidth: 44 }}
              >✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 20px 8px' }}>
              {/* Info ringkas */}
              <div style={{
                background: '#F4F6F4', borderRadius: 12, padding: '12px 14px',
                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#15935A', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>
                  {editModal.no_rumah}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1B211E' }}>
                    {editModal.expand?.user?.name || 'Tanpa Nama'}
                  </div>
                </div>
                {editModal.pengurus && (
                  <span style={{
                    background: '#FBF1DD', color: '#C8821A',
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  }}>Pengurus</span>
                )}
              </div>

              {/* No. Rumah */}
              <div className="form-group">
                <label>No. Rumah</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.no_rumah}
                  onChange={e => setEditForm(prev => ({ ...prev, no_rumah: e.target.value.toUpperCase() }))}
                  placeholder="A01"
                  maxLength={5}
                />
              </div>

              {/* No. WA */}
              <div className="form-group">
                <label>No. WhatsApp</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.no_wa}
                  onChange={e => setEditForm(prev => ({ ...prev, no_wa: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="0812xxxxxxxx"
                />
              </div>

              {/* Agama */}
              <div className="form-group">
                <label>Agama</label>
                <select
                  className="form-control"
                  value={editForm.agama}
                  onChange={e => setEditForm(prev => ({ ...prev, agama: e.target.value }))}
                >
                  {Object.entries(agamaLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              {statusList.length > 0 && (
                <div className="form-group">
                  <label>Status Warga</label>
                  <select
                    className="form-control"
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">-- Pilih Status --</option>
                    {statusList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama}{s.jumlah_iuran ? ` (Rp ${(s.jumlah_iuran || 0).toLocaleString('id-ID')})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toggle Pengurus */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ margin: 0 }}>Pengurus</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={editForm.pengurus}
                      onChange={e => setEditForm(prev => ({ ...prev, pengurus: e.target.checked }))}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{
              display: 'flex', gap: 10, padding: '12px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)',
            }}>
              <button
                onClick={() => setEditModal(null)}
                disabled={saving}
                className="btn"
                style={{
                  flex: 1, background: '#F0F2F0', color: '#475569',
                  border: 'none', borderRadius: 14, fontSize: 15,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: 50,
                }}
              >Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  flex: 1.5, borderRadius: 14, fontSize: 15,
                  fontWeight: 700, minHeight: 50,
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.6s linear infinite',
                      display: 'inline-block',
                    }} />
                    Menyimpan...
                  </>
                ) : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .wa-link:hover { color: #128C7E !important; }
        .wa-link:hover svg { fill: #128C7E !important; }
      `}</style>

    </div>
  );
}