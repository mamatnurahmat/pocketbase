import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdleTimer } from './IdleTimer';
import { pb } from '../lib/pocketbase';

const PIN_LENGTH = 6;

export default function PinScreen() {
  const navigate = useNavigate();
  const { unlock, wargaPin, loadPin } = useIdleTimer();
  const [pin, setPin] = useState([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input tersembunyi untuk keyboard fisik
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyPress = useCallback((key) => {
    if (pin.length >= PIN_LENGTH) return;
    setError(false);
    const newPin = [...pin, key];
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      verifyPin(newPin.join(''));
    }
  }, [pin]);

  const handleDelete = useCallback(() => {
    if (pin.length === 0) return;
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  }, [pin]);

  const verifyPin = async (entered) => {
    // Tunggu sebentar biar animasi DOT terlihat
    await new Promise((r) => setTimeout(r, 200));

    // Ambil PIN terbaru dari database
    let currentPin = wargaPin;
    try {
      const user = pb.authStore.model;
      const w = await pb.collection('warga').getFirstListItem(`user="${user.id}"`);
      currentPin = w.pin || '666666';
      // update context
      loadPin();
    } catch {}

    if (entered === currentPin) {
      unlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin([]);
      }, 600);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  // Dot indicators
  const dots = [];
  for (let i = 0; i < PIN_LENGTH; i++) {
    dots.push(
      <div
        key={i}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: i < pin.length ? '#0F1A14' : '#E6EBE7',
          transition: 'all 0.15s ease',
          transform: i === pin.length && !error ? 'scale(1.15)' : 'scale(1)',
        }}
      />
    );
  }

  // Tombol keypad
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#F4F6F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* Ikon gembok */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          background: 'linear-gradient(150deg, #1FAE69, #0C6B40)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 14px 30px -10px rgba(12,107,64,.55)',
          marginBottom: 20,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="#fff" strokeWidth="1.8"/>
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1.2" fill="#fff"/>
        </svg>
      </div>

      {/* Title */}
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0F1A14', marginBottom: 4 }}>
        Masukkan PIN
      </div>
      <div style={{ fontSize: 14, color: '#8A9991', marginBottom: 32 }}>
        Untuk melanjutkan ke aplikasi
      </div>

      {/* PIN Dots */}
      <div
        className={shake ? 'pin-shake' : ''}
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 40,
        }}
      >
        {dots}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#C24A4A',
            background: '#FBE9E9',
            padding: '8px 16px',
            borderRadius: 10,
            marginBottom: 24,
          }}
        >
          PIN salah. Coba lagi.
        </div>
      )}

      {/* Hidden input untuk keyboard fisik */}
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 1,
          height: 1,
        }}
        onKeyDown={(e) => {
          if (e.key >= '0' && e.key <= '9') {
            handleKeyPress(e.key);
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            handleDelete();
          } else if (e.key === 'Enter') {
            // Submit jika sudah 6 digit
            if (pin.length === PIN_LENGTH) verifyPin(pin.join(''));
          }
        }}
      />

      {/* Numpad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          maxWidth: 280,
          width: '100%',
          padding: '0 20px',
        }}
      >
        {keys.map((key, i) => {
          if (key === '') {
            return <div key={i} />; // Spacer
          }
          if (key === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                style={{
                  height: 64,
                  borderRadius: 20,
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#3A453F',
                  fontSize: 22,
                }}
                aria-label="Hapus"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M7 4l-5 8 5 8h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 9l-4 4 4 4M10 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0"/>
                </svg>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M10 9l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 9l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                </svg>
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleKeyPress(key)}
              style={{
                height: 64,
                borderRadius: 20,
                border: 'none',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 26,
                fontWeight: 700,
                color: '#0F1A14',
                boxShadow: '0 1px 3px rgba(15,26,20,.06), 0 1px 2px rgba(15,26,20,.04)',
                transition: 'transform 0.1s, background 0.1s',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
              onPointerDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.93)';
                e.currentTarget.style.background = '#E8EBE8';
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#fff';
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#fff';
              }}
              aria-label={`Tombol ${key}`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Lupa PIN / Logout */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            color: '#C24A4A',
            cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Keluar / Ganti Akun
        </button>
      </div>

      {/* Inline keyframes untuk shake */}
      <style>{`
        .pin-shake {
          animation: shake 0.5s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}