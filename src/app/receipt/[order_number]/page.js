'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChefHat, ReceiptText } from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
export default function ReceiptPage({ params }) {
  const { getSavedOrder } = useCart();
  const [order, setOrder] = useState(null);
  const number = decodeURIComponent(params.order_number);
  useEffect(() => {
    const saved = getSavedOrder();
    setOrder(String(saved?.order_number) === number ? saved : null);
  }, [getSavedOrder, number]);
  return <main className="receipt-page"><section className="receipt-card"><Image className="receipt-logo" src="/the-meal-guides-logo.png" alt="The Meal Guides" width={110} height={73} /><div className="success-mark"><Check size={40} /></div><p className="kicker">Order received</p><h1>You&apos;re all set!</h1><p className="receipt-intro">We&apos;ve sent your order to the kitchen. Keep this screen handy.</p><div className="order-ticket"><span>Order number</span><strong>{number}</strong><div className="status-pill"><i /> Pending payment</div></div>
    {order && <div className="receipt-items"><div className="receipt-title"><ReceiptText /><h2>Order summary</h2></div>{order.items?.map((item) => <div className="receipt-item" key={item.cart_id}><span>{item.quantity}×</span><div><strong>{item.name}</strong>{item.selected_options?.length > 0 && <small>{item.selected_options.map((option) => option.option_name).join(', ')}</small>}</div><b>{money(item.total_price)}</b></div>)}<div className="receipt-total"><span>Total</span><strong>{money(order.subtotal)}</strong></div></div>}
    <div className="cashier-note"><ChefHat /><div><strong>Next stop: the cashier</strong><p>Show this screen to the cashier to settle your payment.</p></div></div><Link href="/" className="secondary-button">Order something else</Link></section><p className="tiny-footer">Thank you for ordering with The Meal Guides.</p></main>;
}
