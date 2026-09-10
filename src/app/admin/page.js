import AdminClient from '@/components/AdminClient';
import AdminLogin from '@/components/AdminLogin';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminAuth';
export const metadata = { title: 'Kitchen Admin' };
export default function AdminPage() {
  const authenticated = verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
  return authenticated ? <AdminClient /> : <AdminLogin />;
}
