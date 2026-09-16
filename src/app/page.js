import Image from 'next/image';
import { ChefHat, Clock3, MapPin, Sparkles } from 'lucide-react';
import { getRestaurants } from '@/lib/api';
import GuestGreeting from '@/components/GuestGreeting';
import FacebookLink from '@/components/FacebookLink';
import RestaurantGrid from '@/components/RestaurantGrid';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let restaurants = [];
  let error = false;
  try { restaurants = await getRestaurants(); } catch (err) { console.error(err); error = true; }
  if (!Array.isArray(restaurants)) restaurants = [];

  return (
    <main className="page-shell home-page">
      <header className="home-hero">
        <GuestGreeting />
        <div className="welcome-banner"><Image src="/banner-logo.png" alt="The Meal Guides" width={1920} height={800} sizes="(max-width: 699px) calc(100vw - 32px), 1120px" priority /></div>
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16} /> Your Trusted Flavor Navigators!</p>
          <h1>Welcome to<br /><span>The Meal Guides</span></h1>
          <p className="hero-question">The world is full of incredible flavors, so sit back, relax, and let your trusted flavor navigators map them straight to your doorstep.</p>
        </div>
        <div className="service-strip"><span><Clock3 size={17} /> Made fresh</span><span><MapPin size={17} /> Deliver straight to you</span></div>
      </header>
      <section className="content-panel">
        <div className="section-heading"><div><p className="kicker">Choose your kitchen</p><h2>Good food, one tap away.</h2></div><span className="live-badge"><i /> Open now</span></div>
        {error ? <div className="state-card"><ChefHat size={34} /><h3>Our menus are taking a quick breather.</h3><p>Please refresh in a moment.</p></div> : restaurants.length === 0 ? <div className="state-card"><ChefHat size={34} /><h3>No kitchens are serving yet.</h3><p>Check back soon for today&apos;s line-up.</p></div> : (
          <RestaurantGrid restaurants={restaurants} />
        )}
      </section>
      <footer className="tiny-footer"><FacebookLink /><p>Made fresh by The Meal Guides · Guest checkout, always.</p></footer>
    </main>
  );
}
