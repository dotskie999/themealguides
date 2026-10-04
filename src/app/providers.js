'use client';
import { CartProvider } from '@/context/CartContext';
import { GuestProvider } from '@/context/GuestContext';
import DeploymentGuestGate from '@/components/DeploymentGuestGate';

export default function Providers({ children }) {
  return <GuestProvider><CartProvider><DeploymentGuestGate>{children}</DeploymentGuestGate></CartProvider></GuestProvider>;
}
