'use client';
import { CartProvider } from '@/context/CartContext';
import { GuestProvider } from '@/context/GuestContext';
import GuestGate from '@/components/GuestGate';

export default function Providers({ children }) {
  return <GuestProvider><CartProvider><GuestGate>{children}</GuestGate></CartProvider></GuestProvider>;
}
