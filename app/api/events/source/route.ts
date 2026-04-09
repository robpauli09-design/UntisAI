import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');
  const start  = searchParams.get('start');
  const end    = searchParams.get('end');

  if (!source || !start || !end) {
    return NextResponse.json({ error: 'source, start, and end required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('source', source)
    .gte('date', start)
    .lte('date', end);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: count ?? 0 });
}
