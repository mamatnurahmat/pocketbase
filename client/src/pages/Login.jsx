import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

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
      let loginIdentity = identity;
      if (/^\d+$/.test(identity)) {
        loginIdentity = "hp_" + identity;
      }
      const authData = await pb.collection('users').authWithPassword(loginIdentity, password);
      try {
        const w = await pb.collection('warga').getFirstListItem(`user="${authData.record.id}"`);
        localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
      } catch (e) {
        localStorage.setItem('isPengurus', 'false');
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Nomor HP / Email atau Password salah.');
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
          <label>Nomor HP atau Email</label>
          <input
            type="text"
            className="form-control"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="08123456789 atau email@mail.com"
            required
          />
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

      <div style={{ flex: 1 }} />
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </div>
  );
}
