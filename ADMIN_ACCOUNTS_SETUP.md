# Admin account setup

Do not deploy the account login until these steps have been completed in the same Supabase project used by the app.

1. Open Supabase Dashboard > SQL Editor.
2. Run `ADMIN_ACCOUNTS_MIGRATION.sql` once.
3. Open the app's `/admin` page locally.
4. Choose **Emergency PIN access** and use the existing `ADMIN_PIN`.
5. Open **Team accounts** and create the first **Super Admin** username and password.
6. Sign out, then sign in with the new username and temporary password. The app requires a new private password before opening the dashboard.

If the main account migration was already installed, run `ADMIN_PASSWORD_CHANGE_MIGRATION.sql` once to add the new password-change flag.

## Permissions

- **Inventory:** create and edit restaurants, categories, menu items, add-on groups, and options. No orders, guest records, deletion, or account management.
- **Admin:** Inventory permissions plus orders, guest information, reports, and order status updates. Cannot delete records or manage accounts.
- **Super Admin:** all dashboard capabilities, deletion, and staff account management.
- **Emergency PIN:** temporary Super Admin session for recovery only. All actions are identified as emergency actions in the audit log.

## Production recommendations

- Create a unique username for every staff member; do not share passwords.
- Staff usernames are backed by hidden Supabase Auth identifiers and do not require a working email address.
- A Super Admin can issue a temporary password from **Team accounts** if a staff member forgets it. The staff member must replace it at their next sign-in.
- Every signed-in staff account can use **Change password** in the dashboard. Emergency PIN sessions cannot change an account password.
- Rotate `ADMIN_PIN` after emergency use.
- Keep `SUPABASE_SECRET_KEY`, `ADMIN_PIN`, and `ADMIN_SESSION_SECRET` server-only.
