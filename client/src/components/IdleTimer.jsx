import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

const IDLE_TIMEOUT = 60_000; // 1 menit
const PIN_ROUTE = '/pin';

const IdleTimerContext = createContext(null);

export function useIdleTimer() {
  return useContext(IdleTimerContext);
}

export function IdleTimerProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [locked, setLocked] = useState(false);
  const [wargaPin, setWargaPin] = useState(null);
  const timerRef = useRef(null);
  const lastPathRef = useRef(location.pathname);

  // Ambil PIN dari database (warga atau scurity)
  const loadPin = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    const user = pb.authStore.model;
    // Coba ambil dari warga dulu
    try {
      const w = await pb.collection('warga').getFirstListItem(`user="${user.id}"`);
      setWargaPin(w.pin || '666666');
      return;
    } catch { /* bukan warga */ }
    // Coba dari scurity
    try {
      const s = await pb.collection('scurity').getFirstListItem(`user="${user.id}"`);
      setWargaPin(s.pin || '666666');
      return;
    } catch { /* bukan scurity */ }
    // Fallback
    setWargaPin('666666');
  }, []);

  useEffect(() => {
    if (pb.authStore.isValid) {
      loadPin();
    } else {
      setWargaPin(null);
      setLocked(false);
    }
  }, [pb.authStore.isValid, loadPin]);

  // Reset timer dan kunci
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Jangan mulai timer jika di halaman login/register/pin
    const skipPaths = ['/login', '/register', PIN_ROUTE];
    if (skipPaths.includes(location.pathname)) return;

    timerRef.current = setTimeout(() => {
      // Kunci hanya jika masih login
      if (pb.authStore.isValid) {
        lastPathRef.current = location.pathname;
        setLocked(true);
        navigate(PIN_ROUTE, { replace: true });
      }
    }, IDLE_TIMEOUT);
  }, [location.pathname, navigate]);

  // Listener aktivitas
  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll', 'mousemove', 'wheel'];
    const handler = () => resetTimer();

    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Reset timer saat pindah halaman
  useEffect(() => {
    if (location.pathname !== PIN_ROUTE) {
      resetTimer();
    }
  }, [location.pathname, resetTimer]);

  // Buka kunci setelah PIN benar
  const unlock = useCallback(() => {
    setLocked(false);
    const target = lastPathRef.current === PIN_ROUTE ? '/dashboard' : lastPathRef.current;
    navigate(target, { replace: true });
    resetTimer();
  }, [navigate, resetTimer]);

  const value = {
    locked,
    wargaPin,
    unlock,
    loadPin,
    lastPath: lastPathRef.current,
  };

  return (
    <IdleTimerContext.Provider value={value}>
      {children}
    </IdleTimerContext.Provider>
  );
}