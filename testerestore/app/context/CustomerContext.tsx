'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getCurrentCustomer,
  login as svcLogin,
  logout as svcLogout,
  register as svcRegister,
  type LoginInput,
  type RegisterInput,
  type StoreCustomer,
  customerWishlistPersistence,
} from '../../lib/medusa/services/auth';
import { MEDUSA_READY } from '../../lib/medusa/config';
import { connectWishlist } from '../../lib/wishlist';

interface CustomerContextType {
  customer: StoreCustomer | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Bu oturumda girişte kullanılan şifre — YALNIZCA bellekte, hiçbir yere
   * kaydedilmiyor. Tek amacı: geçici şifreyle giren müşteriye zorunlu şifre
   * değiştirme ekranında aynı şifreyi bir daha yazdırmamak
   * (bkz. ForcePasswordChange). Çıkışta ve değişim sonrası temizlenir.
   */
  pendingPassword: string | null;
  clearPendingPassword: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  const authEpoch = useRef(0);

  useEffect(() => {
    const id = customer?.id;
    void connectWishlist(id ?? null, id ? customerWishlistPersistence(id) : undefined);
    return () => { void connectWishlist(null); };
  }, [customer?.id]);

  const refresh = useCallback(async () => {
    const current = authEpoch.current;
    if (!MEDUSA_READY) {
      setLoading(false);
      return;
    }
    try {
      const c = await getCurrentCustomer();
      if (current === authEpoch.current) setCustomer(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    ++authEpoch.current;
    setError(null);
    try {
      const c = await svcLogin(input);
      setCustomer(c);
      setPendingPassword(input.password);
    } catch (e) {
      setError(
        e instanceof Error && e.message.toLowerCase().includes('unauthorized')
          ? 'E-posta veya şifre hatalı.'
          : 'Giriş başarısız: ' + (e instanceof Error ? e.message : String(e))
      );
      throw e;
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    ++authEpoch.current;
    setError(null);
    try {
      const c = await svcRegister(input);
      setCustomer(c);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.toLowerCase().includes('already')
          ? 'Bu e-posta adresi zaten kayıtlı.'
          : 'Kayıt başarısız: ' + msg
      );
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    ++authEpoch.current;
    void connectWishlist(null);
    setCustomer(null);
    setPendingPassword(null);
    await svcLogout();
  }, []);

  const clearPendingPassword = useCallback(() => setPendingPassword(null), []);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        loading,
        error,
        isAuthenticated: !!customer,
        login,
        register,
        logout,
        refresh,
        pendingPassword,
        clearPendingPassword,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider');
  return ctx;
}
