import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.logAktivitas.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('API /api/logs GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
