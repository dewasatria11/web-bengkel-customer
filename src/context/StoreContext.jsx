import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [storeName, setStoreNameState] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStoreProfile = async () => {
    try {
      const { data } = await supabase
        .from('store_profile')
        .select('name')
        .eq('id', 1)
        .maybeSingle();

      if (data?.name) {
        setStoreNameState(data.name);
        document.title = data.name;
      }
    } catch (err) {
      console.error('Error fetching store profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreProfile();
  }, []);

  const setStoreName = (name) => {
    setStoreNameState(name);
    document.title = name || 'Bengkel';
  };

  return (
    <StoreContext.Provider value={{ storeName, setStoreName, loading, refetch: fetchStoreProfile }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}