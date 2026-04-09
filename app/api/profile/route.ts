import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('user_profile').select('notes').eq('id', 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data.notes });
}

export async function PUT(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const { notes } = await req.json();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_profile')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
