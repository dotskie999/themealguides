import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminAuth';

const READ_ACTIONS = new Set(['getOrders', 'getAdminData', 'getAdminSnapshot']);
const WRITE_ACTIONS = new Set([
  'saveRestaurant',
  'saveCategory',
  'saveMenuItem',
  'saveOptionGroup',
  'saveOption',
  'deleteOptionGroup',
  'deleteOption',
  'updateOrderStatus',
]);

function unauthorized(request) {
  return !verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
}

export async function GET(request) {
  if (unauthorized(request)) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'getOrders';
  if (!READ_ACTIONS.has(action)) return NextResponse.json({ error: 'Unsupported admin read action.' }, { status: 400 });
  const params = Object.fromEntries(searchParams.entries());
  delete params.action;
  try { return NextResponse.json(await apiRequest(action, { params })); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  if (unauthorized(request)) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  try {
    const { action, ...body } = await request.json();
    if (!action) throw new Error('Admin action is required.');
    if (!WRITE_ACTIONS.has(action)) return NextResponse.json({ error: 'Unsupported admin write action.' }, { status: 400 });
    return NextResponse.json(await apiRequest(action, { method: 'POST', body }));
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
