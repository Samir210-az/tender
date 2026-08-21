'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from './supabaseClient';

const STORAGE_KEY = 'tender_ai_session';

/**
 * Abunəlik statusları:
 *  - "none"     → qeydiyyat yoxdur
 *  - "pending"  → qeydiyyat göndərilib, admin təsdiqini gözləyir
 *  - "active"   → aktiv abunə (monthly/yearly)
 *  - "expired"  → müddəti bitib
 *  - "rejected" → admin rədd edib
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
    const { data, error } = await getSupabase().rpc('get_registration_status', { p_id: regId });

    if (error || !data || data.length === 0) {
      setStatus('none');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const reg = data[0];

    if (reg.status === 'pending') {
      setStatus('pending');
      setSubscription(reg);
      return;
    }

    if (reg.status === 'rejected') {
      setStatus('rejected');
      setSubscription(reg);
      return;
    }

    if (reg.status === 'active') {
      const now = Date.now();
      const expiresAt = reg.expires_at ? new Date(reg.expires_at).getTime() : null;
      if (expiresAt && now > expiresAt) {
        setStatus('expired');
        setSubscription(reg);
        return;
      }
      setStatus('active');
      setSubscription(reg);
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
    verifyWithServer(local.regId);
  }, [readLocal, verifyWithServer]);

  async function hashPin(pin) {
    const enc = new TextEncoder().encode(pin.trim());
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Yeni qeydiyyat yaradır (telefon + PIN + plan seçimi).
   * Ödəniş WhatsApp üzərindən manual təsdiqlənir — admin panel bunu "active"
   * statusuna keçirir və expires_at təyin edir.
   */
  const register = useCallback(async ({ companyName, phone, pin, plan }) => {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) {
      throw new Error(`ENV YOXDUR — URL: ${url ? 'var' : 'YOXDUR'}, KEY: ${key ? 'var' : 'YOXDUR'}`);
    }
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      throw new Error(`URL FORMATI SƏHV: "${url}" (uzunluq: ${url.length})`);
    }
    if (!key.startsWith('eyJ')) {
      throw new Error(`KEY FORMATI SƏHV — başlanğıc: "${key.slice(0, 10)}", uzunluq: ${key.length}`);
    }

    // Gizli simvolları aşkar etmək üçün raw JSON təsviri
    if (/\s/.test(url) || /\s/.test(key)) {
      throw new Error(`GİZLİ SİMVOL VAR — URL: ${JSON.stringify(url)}, KEY başlanğıc/son: ${JSON.stringify(key.slice(0, 15))} ... ${JSON.stringify(key.slice(-15))}`);
    }

    let client;
    try {
      client = getSupabase();
    } catch (clientErr) {
      throw new Error(`CLIENT YARADILA BİLMƏDİ — URL: ${JSON.stringify(url)}, KEY uzunluq: ${key.length}, orijinal xəta: ${clientErr.message}`);
    }

    const pinHash = await hashPin(pin);

    const { data, error } = await client
      .from('registrations')
      .insert({
        company_name: companyName,
        phone,
        pin_hash: pinHash,
        plan,
        status: 'pending',
      })
      .select('id, status, plan, company_name')
      .single();

    if (error) throw error;

    writeLocal({ regId: data.id, lastCheckedAt: 0 });
    setStatus('pending');
    setSubscription(data);
    return data.id;
  }, [writeLocal]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus('none');
    setSubscription(null);
  }, []);

  return {
    status,
    subscription,
    register,
    logout,
    refresh: () => {
      const local = readLocal();
      if (local?.regId) verifyWithServer(local.regId);
    },
  };
}
