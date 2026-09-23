import './globals.css';
import 'leaflet/dist/leaflet.css';
import Providers from './providers';
import FloatingCart from '@/components/FloatingCart';

export const metadata = {
  title: { default: 'The Meal Guides', template: '%s · The Meal Guides' },
  description: 'Fresh picks from your favorite neighborhood kitchens, all in one order.',
  icons: { icon: '/the-meal-guides-logo.png', apple: '/the-meal-guides-logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}<FloatingCart /></Providers>
      </body>
    </html>
  )
}
