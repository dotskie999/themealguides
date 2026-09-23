import AdminClient from '@/components/AdminClient';
import AdminLogin from '@/components/AdminLogin';
import AdminPasswordChange from '@/components/AdminPasswordChange';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/adminAuth';
import { resolveAdminSession } from '@/lib/adminAccess';
export const metadata = { title: 'Kitchen Admin' };
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const session = await resolveAdminSession(cookies().get(ADMIN_COOKIE)?.value);
  if(!session) return <AdminLogin />;
  if(session.mustChangePassword) return <AdminPasswordChange session={session} forced/>;
  return <AdminClient session={session} />;
}
