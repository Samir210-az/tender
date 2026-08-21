'use client';

import { useEffect, useState, useCallback } from 'react';
import { ref, get, set, push, onValue } from 'firebase/database';
import { db } from './firebase';

const STORAGE_KEY = 'tender_ai_session';
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 saatda bir serverlə yenidən yoxla

/**
 * Abunəlik statusları:
 *  - "none"      → qeydiyyat yoxdur
 *  - "pending"    → qeydiyyat göndərilib, admin təsdiqini gözləyir
 *  - "active"     → aktiv abunə (monthly/yearly)
 *  - "expired"    → müddəti bitib
 *  - "rejected"   → admin rədd edib
 */
export function useSubscription() {
  const [status, setStatus] = useState('checking');
  const [subscription, setSubscription] = useState(null);

  const readLocal = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }, []);

  const writeLocal = useCallback((data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const verifyWithServer = useCallback(async (regId) => {
    const snap = await get(ref(db, `registrations/tender/${regId}`));
    if (!snap.exists()) {
      setStatus('none');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const data = snap.val();

    if (data.status === 'pending') {
      setStatus('pending');
      setSubscription(data);
      return;
    }

    if (data.status === 'rejected') {
      setStatus('rejected');
      setSubscription(data);
      return;
    }

    if (data.status === 'active') {
      const now = Date.now();
      if (data.expiresAt && now > data.expiresAt) {
        setStatus('expired');
        setSubscription(data);
        return;
      }
      setStatus('active');
      setSubscription(data);
      writeLocal({ regId, lastCheckedAt: now });
      return;
    }

    setStatus('none');
  }, [writeLocal]);

  useEffect(() => {
    const local = readLocal();
    if (!local?.regId) {
      setStatus('none');
      return;
    }

    const stale = !local.lastCheckedAt || Date.now() - local.lastCheckedAt > CHECK_INTERVAL_MS;
    if (stale) {
      verifyWithServer(local.regId);
    } else {
      // lokal keş etibarlıdır — amma vəziyyəti göstərmək üçün yenə serverdən son datanı çəkirik
      verifyWithServer(local.regId);
    }
  }, [readLocal, verifyWithServer]);

  /**
   * Yeni qeydiyyat yaradır (telefon + PIN + plan seçimi).
   * Ödəniş WhatsApp üzərindən manual təsdiqlənir — admin panel bunu "active"
   * statusuna keçirir və expiresAt təyin edir.
   */
  const register = useCallback(async ({ companyName, phone, pin, plan }) => {
    const regRef = push(ref(db, 'registrations/tender'));
    const payload = {
      companyName,
      phone,
      pin, // client-də hash edilməli deyil — server-side admin panelində yoxlanılır
      plan, // "monthly" | "yearly"
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: null,
    };
    await set(regRef, payload);
    writeLocal({ regId: regRef.key, lastCheckedAt: 0 });
    setStatus('pending');
    setSubscription(payload);
    return regRef.key;
  }, [writeLocal]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus('none');
    setSubscription(null);
  }, []);

  return { status, subscription, register, logout, refresh: () => {
    const local = readLocal();
    if (local?.regId) verifyWithServer(local.regId);
  } };
}
