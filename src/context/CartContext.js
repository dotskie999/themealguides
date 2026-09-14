'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'tmg-cart-v1';
const ORDER_KEY = 'tmg-last-order-v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      setItems(Array.isArray(stored) ? stored : []);
    } catch { setItems([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items, ready]);

  const addItem = (item) => {
    if (items.length && String(items[0].restaurant_id) !== String(item.restaurant_id)) return false;
    setItems((current) => [...current, { ...item, cart_id: crypto.randomUUID() }]);
    return true;
  };
  const removeItem = useCallback((cartId) => setItems((current) => current.filter((item) => item.cart_id !== cartId)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.total_price || 0), 0), [items]);
  const saveOrder = useCallback((order) => localStorage.setItem(ORDER_KEY, JSON.stringify(order)), []);
  const getSavedOrder = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null');
      return stored && typeof stored === 'object' ? stored : null;
    } catch { return null; }
  }, []);

  return <CartContext.Provider value={{ items, ready, subtotal, addItem, removeItem, clearCart, saveOrder, getSavedOrder }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}
