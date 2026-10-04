# Philippines and Ghana deployment setup

This project uses one GitHub repository and one Supabase project, with two independently scoped Vercel deployments.

| Deployment | Domain | Country scope | Markets |
| --- | --- | --- | --- |
| Philippines | `order.themealguides.com` | `PH` | `ph-ncr` |
| Ghana | `gh.themealguides.com` | `GH` | `gh-accra`, `gh-tema` |

## 1. Update Supabase

Run `DEPLOYMENT_SEPARATION_MIGRATION.sql` once in Supabase **SQL Editor**. Existing staff accounts and activity logs are assigned to the Philippines deployment.

Confirm the result:

```sql
select username, role, country_scope, active
from public.admin_profiles
order by country_scope, username;
```

## 2. Create the first Ghana Super Admin

Existing accounts become PH accounts. Bootstrap one Ghana account from the Supabase dashboard:

1. Open **Authentication > Users > Add user**.
2. Use an internal email following the app convention, such as `ghana_owner@staff.themealguides.local`.
3. Set a temporary password of at least eight characters and enable automatic confirmation.
4. Run the SQL below, replacing the email and display name if needed:

```sql
insert into public.admin_profiles (
  user_id, email, username, display_name, role, active,
  must_change_password, country_scope
)
select
  id, email, 'ghana_owner', 'Ghana Owner', 'super_admin', true,
  true, 'GH'
from auth.users
where email = 'ghana_owner@staff.themealguides.local'
on conflict (user_id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  role = excluded.role,
  active = excluded.active,
  must_change_password = excluded.must_change_password,
  country_scope = excluded.country_scope;
```

The login username is `ghana_owner`, not the internal email. After signing in, that Super Admin can create the remaining Ghana staff accounts normally.

## 3. Test locally

Only run one country mode at a time from the same folder.

Philippines PowerShell session:

```powershell
$env:DEPLOYMENT_COUNTRY="PH"
$env:NEXT_PUBLIC_DEPLOYMENT_COUNTRY="PH"
npm run dev -- -p 3000
```

Open:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Stop the server with `Ctrl+C`, then start Ghana:

```powershell
$env:DEPLOYMENT_COUNTRY="GH"
$env:NEXT_PUBLIC_DEPLOYMENT_COUNTRY="GH"
npm run dev -- -p 3001
```

Open:

- Storefront: `http://localhost:3001`
- Admin: `http://localhost:3001/admin`

## 4. Create the Philippines Vercel project

Create a Vercel project from the repository and add `order.themealguides.com`.

Environment variables:

```text
DEPLOYMENT_COUNTRY=PH
NEXT_PUBLIC_DEPLOYMENT_COUNTRY=PH
SUPABASE_URL=<shared Supabase URL>
SUPABASE_SECRET_KEY=<shared Supabase secret key>
GEOAPIFY_API_KEY=<Geoapify key>
ADMIN_PIN=<Philippines-only emergency PIN>
ADMIN_SESSION_SECRET=<unique random Philippines session secret>
```

Use **Secret** for Supabase, Geoapify, PIN, and session-secret values. Use **Config** for the two country values.

## 5. Create the Ghana Vercel project

Import the same GitHub repository as a second Vercel project and add `gh.themealguides.com`.

Environment variables:

```text
DEPLOYMENT_COUNTRY=GH
NEXT_PUBLIC_DEPLOYMENT_COUNTRY=GH
SUPABASE_URL=<same shared Supabase URL>
SUPABASE_SECRET_KEY=<same shared Supabase secret key>
GEOAPIFY_API_KEY=<Geoapify key>
ADMIN_PIN=<different Ghana-only emergency PIN>
ADMIN_SESSION_SECRET=<different random Ghana session secret>
```

Do not copy the PH emergency PIN or session secret into the Ghana project.

## 6. Verification checklist

- PH storefront shows only `ph-*` restaurants and no country selector.
- Ghana storefront shows only `gh-*` restaurants and offers Accra/Tema only.
- PH `/admin` rejects Ghana staff accounts.
- Ghana `/admin` rejects PH staff accounts.
- Each admin sees only its country’s orders, guests, restaurants, menus, add-ons, staff, and activity.
- Ghana has no Philippine delivery-fare settings tab.
- Direct API requests using the other country’s market are rejected.
- Admin cookies, browser guest profiles, carts, and saved receipts are country-specific.
