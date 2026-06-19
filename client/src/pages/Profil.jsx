import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(pb.authStore.model);
  const [warga, setWarga] = useState(null);

  // Name form
  const [name, setName] = useState(user?.name || '');
  const [loadingName, setLoadingName] = useState(false);
  const [msgName, setMsgName] = useState({ text: '', type: '' });

  // Phone form
  const [newPhone, setNewPhone] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [msgPhone, setMsgPhone] = useState({ text: '', type: '' });

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPw, setLoadingPw] = useState(false);
  const [msgPw, setMsgPw] = useState({ text: '', type: '' });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.name || user?.username?.replace('hp_', '') || 'Warga';
  const phone = user?.username?.replace('hp_', '') || '-';

  useEffect(() => {
    const fetchWarga = async () => {
      try {
        const w = await pb.collection('warga').getFirstListItem(`user="${user.id}"`);
        setWarga(w);
      } catch (e) { /* no warga linked */ }
    };
    if (pb.authStore.isValid) fetchWarga();
  }, [user]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setLoadingName(true);
    setMsgName({ text: '', type: '' });
    try {
      const updated = await pb.collection('users').update(user.id, { name });
      setUser(updated);
      setMsgName({ text: 'Nama berhasil diperbarui!', type: 'success' });
    } catch (err) {
      setMsgName({ text: err.message || 'Gagal memperbarui nama.', type: 'error' });
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    if (!newPhone || newPhone.length < 8) {
      return setMsgPhone({ text: 'Nomor HP minimal 8 digit.', type: 'error' });
    }
    setLoadingPhone(true);
    setMsgPhone({ text: '', type: '' });
    try {
      const updated = await pb.collection('users').update(user.id, {
        username: 'hp_' + newPhone,
      });
      setUser(updated);
      setNewPhone('');
      setMsgPhone({ text: 'Nomor HP berhasil diperbarui!', type: 'success' });
    } catch (err) {
      let errMsg = 'Gagal memperbarui nomor HP.';
      if (err.response?.data?.username) {
        errMsg = 'Nomor HP sudah digunakan akun lain.';
      }
      setMsgPhone({ text: errMsg, type: 'error' });
    } finally {
      setLoadingPhone(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      return setMsgPw({ text: 'Password baru minimal 8 karakter.', type: 'error' });
    }
    if (newPassword !== confirmPassword) {
      return setMsgPw({ text: 'Konfirmasi password tidak cocok.', type: 'error' });
    }
    setLoadingPw(true);
    setMsgPw({ text: '', type: '' });
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsgPw({ text: 'Password berhasil diubah! Silakan login ulang.', type: 'success' });
      // PocketBase invalidates auth after password change
      setTimeout(() => {
        pb.authStore.clear();
        navigate('/login');
      }, 1500);
    } catch (err) {
      let errMsg = 'Gagal mengubah password.';
      if (err.response?.data?.oldPassword) {
        errMsg = 'Password lama salah.';
      }
      setMsgPw({ text: errMsg, type: 'error' });
    } finally {
      setLoadingPw(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
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
            <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
            <div style={{ marginTop: 3, fontSize: 13, color: '#8A9991' }}>
              {warga ? `No. Rumah ${warga.no_rumah}` : `HP: ${phone}`}
            </div>
          </div>
        </div>

        {/* Update Name */}
        <div className="mt-3 section-title">Ubah nama</div>
        <div className="card">
          {msgName.text && (
            <div className={`alert ${msgName.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {msgName.text}
            </div>
          )}
          <form onSubmit={handleUpdateName}>
            <div className="form-group">
              <label>Nama lengkap</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingName} style={{ height: 48 }}>
              {loadingName ? 'Menyimpan...' : 'Simpan nama'}
            </button>
          </form>
        </div>

        {/* Update Phone */}
        <div className="mt-3 section-title">Ubah nomor HP</div>
        <div className="card">
          {msgPhone.text && (
            <div className={`alert ${msgPhone.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {msgPhone.text}
            </div>
          )}
          <div style={{ marginBottom: 12, fontSize: 13, color: '#8A9991' }}>
            Nomor saat ini: <strong style={{ color: '#3A453F' }}>{phone}</strong>
          </div>
          <form onSubmit={handleUpdatePhone}>
            <div className="form-group">
              <label>Nomor HP baru</label>
              <input
                type="text"
                className="form-control"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingPhone || !newPhone} style={{ height: 48 }}>
              {loadingPhone ? 'Menyimpan...' : 'Ubah nomor HP'}
            </button>
          </form>
        </div>

        {/* Update Password */}
        <div className="mt-3 section-title">Ubah password</div>
        <div className="card">
          {msgPw.text && (
            <div className={`alert ${msgPw.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {msgPw.text}
            </div>
          )}
          <form onSubmit={handleUpdatePassword}>
            <div className="form-group">
              <label>Password lama</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                required
              />
            </div>
            <div className="form-group">
              <label>Password baru</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label>Konfirmasi password baru</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingPw} style={{ height: 48 }}>
              {loadingPw ? 'Mengubah...' : 'Ubah password'}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-3 section-title">Informasi akun</div>
        <div className="card" style={{ padding: '6px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F0F2F0' }}>
            <span style={{ fontSize: 13, color: '#8A9991' }}>Nomor HP</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3A453F' }}>{phone}</span>
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

