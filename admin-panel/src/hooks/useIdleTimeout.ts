'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS = 3 * 60 * 60 * 1000;   // 3 horas
const WARN_MS = IDLE_MS - 2 * 60 * 1000; // avisa 2 min antes

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useIdleTimeout(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (idleTimer.current)  clearTimeout(idleTimer.current);
    if (warnTimer.current)  clearTimeout(warnTimer.current);
    setShowWarning(false);

    warnTimer.current = setTimeout(() => setShowWarning(true), WARN_MS);
    idleTimer.current = setTimeout(() => {
      setShowWarning(false);
      onLogout();
    }, IDLE_MS);
  }, [onLogout]);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);

  return { showWarning, resetTimer: reset };
}
