import 'server-only';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminToken } from '@/lib/adminAuth';

export const ADMIN_ROLES = ['inventory', 'admin', 'super_admin'];

const missingPasswordFlag=(error)=>error?.code==='42703'||String(error?.message||'').includes('must_change_password');

export async function resolveAdminSession(token) {
  const tokenSession = verifyAdminToken(token);
  if (!tokenSession) return null;
  if (tokenSession.type === 'emergency') return {
    type:'emergency', userId:null, displayName:'Emergency access', email:null, role:'super_admin', emergency:true,
  };
  let { data, error } = await supabaseAdmin
    .from('admin_profiles')
    .select('user_id,username,display_name,role,active,must_change_password')
    .eq('user_id', tokenSession.userId)
    .maybeSingle();
  if(missingPasswordFlag(error)) ({data,error}=await supabaseAdmin.from('admin_profiles').select('user_id,username,display_name,role,active').eq('user_id',tokenSession.userId).maybeSingle());
  if (error || !data || !data.active || !ADMIN_ROLES.includes(data.role)) return null;
  return { type:'account', userId:data.user_id, username:data.username, displayName:data.display_name, role:data.role, mustChangePassword:Boolean(data.must_change_password), emergency:false };
}

export async function logAdminAction(session, action, targetType = null, targetId = null, details = {}) {
  const { error } = await supabaseAdmin.from('admin_activity_logs').insert({
    actor_user_id:session.userId,
    actor_name:session.displayName,
    actor_role:session.role,
    actor_type:session.emergency?'emergency':'account',
    action,
    target_type:targetType,
    target_id:targetId ? String(targetId) : null,
    details,
  });
  if (error && !['42P01','PGRST205'].includes(error.code)) console.error('Could not write admin audit log:', error.message);
}
