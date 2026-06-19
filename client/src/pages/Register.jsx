import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

export default function Register() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      return setError('Password tidak cocok');
    }

    setLoading(true);

    try {
      const payload = {
        username: "hp_" + phone,
        password,
        passwordConfirm,
      };
      if (email.trim() !== '') {
        payload.email = email;
      }
      await pb.collection('users').create(payload);
      await pb.collection('users').authWithPassword("hp_" + phone, password);
      navigate('/dashboard');
    } catch (err) {
      let errMsg = 'Gagal mendaftar. Silakan coba lagi.';
      if (err.response?.data?.username) {
        errMsg = 'Nomor HP sudah terdaftar.';
      } else if (err.response?.data?.email) {
        errMsg = 'Email sudah terdaftar.';
      }
      setError(errMsg);
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
        <h1 style={{ marginTop: 24 }}>Buat Akun</h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
          Daftar untuk mulai menggunakan layanan warga.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 20 }}>{error}</div>}

      <form onSubmit={handleRegister} style={{ marginTop: 28 }}>
        <div className="form-group">
          <label>Nomor HP</label>
          <input
            type="text"
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="08123456789"
            required
          />
        </div>
        <div className="form-group">
          <label>Email (opsional)</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@domain.com"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            required
            minLength={8}
          />
        </div>
        <div className="form-group">
          <label>Konfirmasi Password</label>
          <input
            type="password"
            className="form-control"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Ulangi password"
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Membuat akun...' : 'Daftar'}
        </button>
      </form>

      <div style={{ flex: 1 }} />
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
        Sudah punya akun? <Link to="/login">Masuk di sini</Link>
      </p>
    </div>
  );
}
