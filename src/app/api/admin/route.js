import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { ADMIN_COOKIE } from '@/lib/adminAuth';
import { logAdminAction, resolveAdminSession } from '@/lib/adminAccess';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { adminUsernameEmail, normalizeAdminUsername, validAdminUsername } from '@/lib/adminUsername';

const READ_ROLES = {
  getOrders:['admin','super_admin'],
  getAdminData:['inventory','admin','super_admin'],
  getAdminSnapshot:['inventory','admin','super_admin'],
  getAdminAccounts:['super_admin'],
  getAdminActivity:['super_admin'],
  getDeliverySettings:['super_admin'],
};
const WRITE_ROLES = {
  saveRestaurant:['inventory','admin','super_admin'],
  saveCategory:['inventory','admin','super_admin'],
  saveMenuItem:['inventory','admin','super_admin'],
  saveOptionGroup:['inventory','admin','super_admin'],
  saveOption:['inventory','admin','super_admin'],
  updateOrderStatus:['admin','super_admin'],
  deleteOptionGroup:['super_admin'],
  deleteOption:['super_admin'],
  saveAdminAccount:['super_admin'],
  saveDeliverySettings:['super_admin'],
};

async function sessionFor(request) {
  return resolveAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}

function forbidden(message='Your account does not have permission for this action.') {
  return NextResponse.json({error:message},{status:403});
}

async function listAdminAccounts() {
  let {data,error}=await supabaseAdmin.from('admin_profiles').select('user_id,username,display_name,role,active,must_change_password,created_at,updated_at').order('display_name');
  if(error?.code==='42703'||String(error?.message||'').includes('must_change_password')) ({data,error}=await supabaseAdmin.from('admin_profiles').select('user_id,username,display_name,role,active,created_at,updated_at').order('display_name'));
  if(error&&['42P01','PGRST205'].includes(error.code)) return [];
  if(error) throw new Error(error.message);
  return data||[];
}

async function listAdminActivity() {
  const {data,error}=await supabaseAdmin.from('admin_activity_logs').select('*').order('created_at',{ascending:false}).limit(100);
  if(error&&['42P01','PGRST205'].includes(error.code)) return [];
  if(error) throw new Error(error.message);
  return data||[];
}

async function saveAdminAccount(record, session) {
  const role=String(record.role||'');
  const active=record.active===true||record.active==='true'||record.active==='yes';
  const displayName=String(record.display_name||'').trim();
  const username=normalizeAdminUsername(record.username);
  if(!displayName||!validAdminUsername(username)||!['inventory','admin','super_admin'].includes(role)) throw new Error('Use a 3–32 character username containing only letters, numbers, dots, dashes, or underscores.');
  if(record.user_id){
    const password=String(record.password||'');
    if(password&&password.length<8) throw new Error('New password must contain at least 8 characters.');
    if(String(record.user_id)===String(session.userId)&&(!active||role!=='super_admin')) throw new Error('You cannot disable or demote your own Super Admin account.');
    const profileUpdate={display_name:displayName,role,active,updated_at:new Date().toISOString()};
    if(password) profileUpdate.must_change_password=true;
    const {data,error}=await supabaseAdmin.from('admin_profiles').update(profileUpdate).eq('user_id',record.user_id).select().single();
    if(error) throw new Error(error.message);
    if(password){const {error:passwordError}=await supabaseAdmin.auth.admin.updateUserById(record.user_id,{password});if(passwordError) throw new Error(passwordError.message);}
    return data;
  }
  const password=String(record.password||'');
  if(password.length<8) throw new Error('Temporary password must contain at least 8 characters.');
  const email=adminUsernameEmail(username);
  const {data:created,error:authError}=await supabaseAdmin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:displayName,username}});
  if(authError||!created.user) throw new Error(authError?.message||'Could not create the staff login.');
  const {data,error}=await supabaseAdmin.from('admin_profiles').insert({user_id:created.user.id,email,username,display_name:displayName,role,active:true,must_change_password:true,created_by:session.userId}).select().single();
  if(error){await supabaseAdmin.auth.admin.deleteUser(created.user.id);throw new Error(error.message);}
  return data;
}

export async function GET(request) {
  const session=await sessionFor(request);
  if(!session) return NextResponse.json({error:'Admin sign-in required.'},{status:401});
  const {searchParams}=new URL(request.url);
  const action=searchParams.get('action')||'getOrders';
  if(!READ_ROLES[action]) return NextResponse.json({error:'Unsupported admin read action.'},{status:400});
  if(!READ_ROLES[action].includes(session.role)) return forbidden();
  try {
    if(action==='getAdminAccounts') return NextResponse.json(await listAdminAccounts());
    if(action==='getAdminActivity') return NextResponse.json(await listAdminActivity());
    const params=Object.fromEntries(searchParams.entries()); delete params.action;
    const result=await apiRequest(action,{params});
    if(session.role==='inventory'){
      if(action==='getAdminSnapshot') return NextResponse.json({...result,orders:[],guests:[]});
      if(action==='getAdminData') return NextResponse.json({...result,guests:[]});
    }
    if(action==='getAdminSnapshot'&&session.role==='super_admin') return NextResponse.json({...result,adminAccounts:await listAdminAccounts(),deliverySettings:await apiRequest('getDeliverySettings')});
    return NextResponse.json(result);
  } catch(error){return NextResponse.json({error:error.message},{status:500});}
}

export async function POST(request) {
  const session=await sessionFor(request);
  if(!session) return NextResponse.json({error:'Admin sign-in required.'},{status:401});
  try {
    const {action,...body}=await request.json();
    if(!action) throw new Error('Admin action is required.');
    if(!WRITE_ROLES[action]) return NextResponse.json({error:'Unsupported admin write action.'},{status:400});
    if(!WRITE_ROLES[action].includes(session.role)) return forbidden('Only a Super Admin can delete records or manage staff accounts.');
    const result=action==='saveAdminAccount'?await saveAdminAccount(body.record||body,session):await apiRequest(action,{method:'POST',body});
    const target=body.record||body;
    await logAdminAction(session,action,action==='saveAdminAccount'?'admin_account':action,target.user_id||target.restaurant_id||target.category_id||target.item_id||target.group_id||target.option_id||target.id||target.order_number,{});
    return NextResponse.json(result);
  } catch(error){return NextResponse.json({error:error.message},{status:500});}
}
