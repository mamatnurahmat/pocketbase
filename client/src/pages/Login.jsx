import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { checkScurity } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginIdentity = identity.trim();
      // Login khusus email format: 3 digit kode rumah @ warga.local (contoh 010@warga.local)
      if (!/^\d{3}@warga\.local$/.test(loginIdentity)) {
        setError('Email tidak valid. Gunakan format: 3 digit kode rumah @warga.local (contoh 010@warga.local).');
        setLoading(false);
        return;
      }
      const authData = await pb.collection('users').authWithPassword(loginIdentity, password);
      try {
        const w = await pb.collection('warga').getFirstListItem(`user="${authData.record.id}"`);
        localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
      } catch (e) {
        localStorage.setItem('isPengurus', 'false');
      }
      const isSc = await checkScurity();
      localStorage.setItem('isScurity', isSc ? 'true' : 'false');
      navigate('/dashboard');
    } catch (err) {
      setError('Email atau Password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ flex: 'none', paddingTop: 24 }}>
        <div className="auth-logo">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M3 11.5L12 4l9 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 10.5V20h14v-9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 20v-5h4v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ marginTop: 24 }}>Masuk ke Warga P2S</h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
          Satu pintu untuk iuran, laporan, dan informasi warga.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 20 }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ marginTop: 28 }}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="text"
            className="form-control"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="010@warga.local"
            required
          />
          <small style={{ color: '#888', display: 'block', marginTop: 6 }}>
            Format: 3 digit kode rumah @warga.local (contoh: 010@warga.local)
          </small>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sedang masuk...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
