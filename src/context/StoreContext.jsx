import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [storeName, setStoreNameState] = useState('');
  const [storeId, setStoreIdState] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStoreProfile = async () => {
    try {
      // First try to fetch both name and store_id
      let { data, error } = await supabase
        .from('store_profile')
        .select('name, store_id')
        .eq('id', 1)
        .maybeSingle();
        
      // Fallback if store_id column doesn't exist yet (PostgREST error)
      if (error && error.code === 'PGRST204') {
        const fallback = await supabase
          .from('store_profile')
          .select('name')
          .eq('id', 1)
          .maybeSingle();
        data = fallback.data;
      }

      if (data) {
        if (data.name) {
          setStoreNameState(data.name);
          document.title = data.name;
        }
        if (data.store_id) {
          setStoreIdState(data.store_id);
        }
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
    <StoreContext.Provider value={{ storeName, storeId, setStoreName, loading, refetch: fetchStoreProfile }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}