import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(pb.authStore.model);
  const [warga, setWarga] = useState(null);

  const phone = user?.username?.replace('hp_', '') || '';
  const displayName = user?.name || phone || 'Warga';

  // Combined Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneInput, setPhoneInput] = useState(phone);
  const [agama, setAgama] = useState('islam');
  const [pengurus, setPengurus] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    const fetchWarga = async () => {
      try {
        const w = await pb.collection('warga').getFirstListItem(`user="${user.id}"`);
        setWarga(w);
        setAgama(w.agama || 'islam');
        setPengurus(w.pengurus || false);
      } catch (e) { /* no warga linked */ }
    };
    if (pb.authStore.isValid) fetchWarga();
  }, [user]);

  // Sync email state when user model changes
  useEffect(() => {
    setEmail(user?.email || '');
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      // ── 1. Update users collection ──
      const userUpdateData = {};

      if (name !== user.name) userUpdateData.name = name;

      // Email tidak bisa diubah oleh user di PocketBase v0.39.x tanpa SMTP
      // Hanya superuser/admin yang bisa update email via dashboard
      if (email !== user.email) {
        // Don't try to update - PocketBase requires SMTP verification
        // Just silently revert to original
        setEmail(user.email);
      }

      const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
      if (cleanPhone && `hp_${cleanPhone}` !== user.username) {
        if (cleanPhone.length < 8) throw new Error('Nomor HP minimal 8 digit.');
        userUpdateData.username = `hp_${cleanPhone}`;
      }

      let passwordChanged = false;
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword) throw new Error('Masukkan password lama untuk mengubah password.');
        if (newPassword.length < 8) throw new Error('Password baru minimal 8 karakter.');
        if (newPassword !== confirmPassword) throw new Error('Konfirmasi password tidak cocok.');

        userUpdateData.oldPassword = oldPassword;
        userUpdateData.password = newPassword;
        userUpdateData.passwordConfirm = confirmPassword;
        passwordChanged = true;
      }

      let updatedUser = user;
      if (Object.keys(userUpdateData).length > 0) {
        updatedUser = await pb.collection('users').update(user.id, userUpdateData);
        setUser(updatedUser);
      }

      // ── 2. Update warga collection (if exists) ──
      if (warga) {
        const wargaUpdateData = {};
        let needWargaUpdate = false;

        if (agama !== warga.agama) {
          wargaUpdateData.agama = agama;
          needWargaUpdate = true;
        }

        const cleanPhone2 = phoneInput.replace(/[^0-9]/g, '');
        if (cleanPhone2 && cleanPhone2 !== (warga.no_wa || '')) {
          wargaUpdateData.no_wa = cleanPhone2;
          needWargaUpdate = true;
        }

        if (name !== (updatedUser?.name || user.name)) {
          // Sync name to user record only — warga doesn't have name field
        }

        if (needWargaUpdate) {
          await pb.collection('warga').update(warga.id, wargaUpdateData);
          setWarga(prev => ({ ...prev, ...wargaUpdateData }));
        }
      }

      setMsg({ text: 'Profil berhasil diperbarui!', type: 'success' });

      if (passwordChanged) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          pb.authStore.clear();
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      let errMsg = err.message || 'Gagal memperbarui profil.';
      if (err.response?.data?.username) errMsg = 'Nomor HP sudah digunakan akun lain.';
      else if (err.response?.data?.email) errMsg = 'Email sudah digunakan akun lain.';
      else if (err.response?.data?.oldPassword) errMsg = 'Password lama salah.';
      setMsg({ text: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0' }}>
        <h2>Profil</h2>
      </div>

      <div className="page-content" style={{ marginTop: 16 }}>
        {/* Profile Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar avatar-lg">{getInitials(displayName)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
              {pengurus && (
                <span style={{ background: '#E3F2FD', color: '#1976D2', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                  Pengurus
                </span>
              )}
            </div>
            <div style={{ marginTop: 3, fontSize: 13, color: '#8A9991' }}>
              {warga ? `No. Rumah ${warga.no_rumah}${warga.no_wa ? ` · HP: ${warga.no_wa}` : ''}` : `HP: ${phone}`}
            </div>
          </div>
        </div>

        {/* Unified Update Form */}
        <div className="mt-3 section-title">Ubah Profil</div>
        <div className="card">
          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
              {msg.text}
            </div>
          )}
          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
              <div style={{ fontSize: 11, color: '#8A9991', marginTop: 6, lineHeight: 1.4 }}>
                Untuk mengubah email, hubungi pengurus RT.
              </div>
            </div>

            <div className="form-group">
              <label>Nomor HP</label>
              <input
                type="text"
                className="form-control"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {warga && (
              <div className="form-group">
                <label>Agama</label>
                <select 
                  className="form-control"
                  value={agama}
                  onChange={(e) => setAgama(e.target.value)}
                >
                  <option value="islam">Islam</option>
                  <option value="katolik">Katolik</option>
                  <option value="protestan">Protestan</option>
                  <option value="hindu">Hindu</option>
                  <option value="budha">Budha</option>
                  <option value="konghucu">Konghucu</option>
                </select>
              </div>
            )}

            <div className="mt-4" style={{ fontSize: 14, fontWeight: 600, color: '#3A453F', marginBottom: 12 }}>
              Ubah Password (Opsional)
            </div>
            <div className="form-group">
              <label>Password Lama</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Isi jika ingin mengubah password"
              />
            </div>
            
            {oldPassword && (
              <>
                <div className="form-group">
                  <label>Password Baru</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label>Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    minLength={8}
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 48, marginTop: 16, width: '100%' }}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-3 section-title">Informasi Akun</div>
        <div className="card" style={{ padding: '6px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F0F2F0' }}>
            <span style={{ fontSize: 13, color: '#8A9991' }}>Nomor HP</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3A453F' }}>{warga?.no_wa || phone || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F0F2F0' }}>
            <span style={{ fontSize: 13, color: '#8A9991' }}>Email</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3A453F' }}>{user?.email || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0' }}>
            <span style={{ fontSize: 13, color: '#8A9991' }}>User ID</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3A453F' }}>{user?.id}</span>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-3">
          <div className="settings-list">
            <div className="settings-item" onClick={handleLogout}>
              <span className="settings-icon" style={{ background: '#FBE9E9' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9" stroke="#C24A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="settings-label danger">Keluar</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
