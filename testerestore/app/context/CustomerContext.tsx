'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
} from '../../lib/medusa/services/auth';
import { MEDUSA_READY } from '../../lib/medusa/config';

interface CustomerContextType {
  customer: StoreCustomer | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!MEDUSA_READY) {
      setLoading(false);
      return;
    }
    try {
      const c = await getCurrentCustomer();
      setCustomer(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    setError(null);
    try {
      const c = await svcLogin(input);
      setCustomer(c);
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
    await svcLogout();
    setCustomer(null);
  }, []);

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
