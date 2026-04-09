import { NextRequest, NextResponse } from 'next/server';

export function requireApiKey(req: NextRequest): NextResponse | null {
  const header = req.headers.get('authorization') ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
