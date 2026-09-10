import React, { createContext, useContext, useState } from 'react';
import type { Product, CartItem, User } from '../types';
import { PRODUCTS } from '../data/products';

interface AppContextType {
  cart: CartItem[];
  user: User | null;
  wishlist: number[];
  compareList: number[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  login: (user: User) => void;
  logout: () => void;
  toggleWishlist: (id: number) => void;
  toggleCompare: (id: number) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([{ product: PRODUCTS[1], quantity: 1 }]);
  const [user, setUser] = useState<User | null>(null);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [compareList, setCompareList] = useState<number[]>([]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart((p) => p.filter((i) => i.product.id !== id));

  const updateQty = (id: number, qty: number) => {
    if (qty === 0) { removeFromCart(id); return; }
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, quantity: qty } : i));
  };

  const toggleWishlist = (id: number) =>
    setWishlist((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const toggleCompare = (id: number) =>
    setCompareList((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 3) return p;
      return [...p, id];
    });

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);
  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ cart, user, wishlist, compareList, addToCart, removeFromCart, updateQty, login, logout, toggleWishlist, toggleCompare, clearCart }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
