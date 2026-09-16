import { getMenu, getRestaurants } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ChefHat } from 'lucide-react';
import MenuClient from '@/components/MenuClient';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/images';
import RestaurantDistance from '@/components/RestaurantDistance';

export const dynamic = 'force-dynamic';
export default async function RestaurantMenu({ params }) {
  const { id } = params;
  let menuItems = [];
  let restaurant = null;
  let error = false;
  try {
    const [menu, restaurants] = await Promise.all([getMenu(id), getRestaurants()]);
    menuItems = menu;
    restaurant = Array.isArray(restaurants) ? restaurants.find((entry) => String(entry.restaurant_id) === String(id)) : null;
  } catch (err) { console.error(err); error = true; }
  if (!Array.isArray(menuItems)) menuItems = [];
  const bannerUrl = normalizeImageUrl(restaurant?.banner_url);
  return <main className="page-shell menu-page">
    <header className={`menu-hero restaurant-cover ${bannerUrl?'has-banner':''}`}>{bannerUrl&&<Image className="restaurant-cover-image" src={bannerUrl} alt={`${restaurant?.name || 'Restaurant'} cover`} fill sizes="(max-width: 1180px) 100vw, 1180px" priority unoptimized referrerPolicy="no-referrer"/>}<div className="restaurant-cover-shade"/><Link href="/" className="back-link"><ArrowLeft size={19} /> All kitchens</Link></header>
    <section className="menu-panel"><div className="restaurant-heading"><p className="eyebrow">Freshly made for you</p><h1>{restaurant?.name || 'Restaurant menu'}</h1><p>{restaurant?.description || 'Choose a favorite, then make it exactly yours.'}</p><RestaurantDistance restaurant={restaurant}/></div>{error ? <div className="state-card"><ChefHat size={34} /><h3>We couldn&apos;t load this menu.</h3><p>Please head back and try again.</p></div> : !menuItems.length ? <div className="state-card"><ChefHat size={34} /><h3>Nothing on the pass yet.</h3><p>This kitchen is updating its menu.</p></div> : <MenuClient items={menuItems} restaurantId={id} />}</section>
  </main>;
}
