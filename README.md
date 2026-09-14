# The Meal Guides

A responsive restaurant ordering storefront and kitchen dashboard built with Next.js. Restaurant, menu, add-on, and order data is stored in Google Sheets through a Google Apps Script web API.

## Features

- Multi-restaurant storefront and categorized menus
- Configurable single- and multiple-choice add-ons
- Persistent guest cart and mobile-responsive checkout
- NCR city and barangay lookup
- Receipt and order-number flow
- PIN-protected restaurant administration dashboard
- Restaurant, category, menu, add-on, order-status, and CSV report management

## Requirements

- Node.js 20 or newer
- npm
- A Google Sheet with the Apps Script backend from `google-apps-script/Code.gs`

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and fill in both values:

   ```env
   NEXT_PUBLIC_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
   ADMIN_SESSION_SECRET="a-long-random-production-secret"
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The admin dashboard is available at `/admin`.

## Google Apps Script backend

1. Open the Google Sheet used by the project.
2. Open **Extensions → Apps Script**.
3. Replace the editor contents with `google-apps-script/Code.gs`.
4. Deploy it as a web app and allow the storefront to access the deployment.
5. Put the deployed `/exec` URL in `NEXT_PUBLIC_API_URL`.

The script expects these sheets: `Restaurants`, `Categories`, `MenuItems`, `OptionGroups`, `Options`, `Orders`, `Order_Counter`, and `AdminAuth`. The administrator PIN is read from cell `AdminAuth!A2`.

After changing `Code.gs`, create a new Apps Script deployment version; saving the script alone does not update the deployed API.

## Validation

Run all repository checks before committing:

```bash
npm run check
```

## Deployment

The frontend can be deployed to Vercel or another Node.js-compatible host. Configure `NEXT_PUBLIC_API_URL` and `ADMIN_SESSION_SECRET` in the hosting provider rather than committing an `.env` file.

Because `NEXT_PUBLIC_API_URL` is used by the server-rendered frontend, the Apps Script deployment must remain reachable from the deployed application.
