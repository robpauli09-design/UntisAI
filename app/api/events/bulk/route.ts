import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const body = await req.json();
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Body must be a non-empty array' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('events').insert(body).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, events: data }, { status: 201 });
}
