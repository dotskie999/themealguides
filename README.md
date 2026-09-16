# The Meal Guides

Mobile-first, multi-restaurant ordering built with Next.js and Supabase. Customers can discover nearby kitchens, customize menu items, place guest orders, and save a downloadable receipt. A PIN-protected dashboard manages restaurants, menus, add-ons, guests, and order status.

## Features

- Responsive restaurant storefront and categorized menus
- Browser geolocation with free straight-line distance and estimated travel time
- Restaurant delivery-radius indicators and nearest-first sorting
- Configurable single- and multiple-choice add-ons
- Consent-based guest profiles saved for returning visits
- NCR city and barangay lookup with editable checkout details
- Server-validated menu prices, add-ons, quantities, and order totals
- Downloadable PNG order receipts
- Facebook links for The Meal Guides
- PIN-protected administration dashboard
- Restaurant, category, menu, add-on, guest, order-status, and CSV report management
- Restaurant and category filters in the administration dashboard

## Technology

- Next.js 14 and React 18
- Supabase/Postgres
- Tailwind/PostCSS plus application CSS
- Lucide icons
- PSGC Cloud for NCR city and barangay lists
- Browser Geolocation API and the Haversine formula for distance estimates

No paid map or routing API is required. Travel times are estimates derived from straight-line distance and are not live-traffic ETAs.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create the database. For a new project, follow [SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md). For an existing project created before guest profiles and geolocation, run these migrations in order:

   - [GUESTS_MIGRATION.sql](./GUESTS_MIGRATION.sql)
   - [GEOLOCATION_MIGRATION.sql](./GEOLOCATION_MIGRATION.sql)

3. Copy `.env.example` to `.env.local` and replace every placeholder:

   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SECRET_KEY="your-server-secret-key"
   ADMIN_PIN="your-private-admin-pin"
   ADMIN_SESSION_SECRET="a-long-random-production-secret"
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). If that port is occupied, Next.js will print the alternate port in the terminal. The dashboard is available at `/admin`.

## Configure restaurant distance

Open **Admin → Restaurants** and enter the business address, latitude, longitude, and delivery radius for each restaurant. Customers must explicitly allow browser location access before distance is calculated. Manual address entry remains available when location permission is declined.

Customer coordinates are server-only data and are covered by the onboarding consent notice. Do not expose the Supabase secret key to client components.

## Validation

Run the same checks used by GitHub Actions:

```bash
npm run check
```

## Deployment

Deploy to Vercel or another Node.js-compatible platform and configure all four environment variables from `.env.example` in the provider’s encrypted environment settings.

For production:

- Use HTTPS so browser geolocation is available.
- Use a unique, strong `ADMIN_SESSION_SECRET` and private `ADMIN_PIN`.
- Keep `SUPABASE_SECRET_KEY` server-only.
- Confirm Row Level Security and the grants in the migration guide.
- Review the consent wording whenever analytics or advertising integrations are introduced.

## Legacy Google Sheets backend

The `google-apps-script/` directory is retained only as migration and rollback reference. The current application reads and writes through Supabase.

## Social

[The Meal Guides on Facebook](https://www.facebook.com/themealguides)
