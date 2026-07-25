import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = prisma as any;

    // 1. Fetch custom Jadwal events
    const jadwalEvents = await db.jadwal.findMany({
      orderBy: { tanggal: 'asc' },
    });

    // 2. Fetch Tagihan (Payment due & records)
    const invoices = await db.tagihan.findMany({
      include: {
        user: {
          select: {
            nama: true,
            kamar: { select: { nomorKamar: true } },
          },
        },
      },
    });

    // 3. Fetch Keluhan (Maintenance & complaints)
    const complaints = await db.keluhan.findMany({
      include: {
        kamar: { select: { nomorKamar: true } },
        tenant: { select: { nama: true } },
      },
    });

    // 4. Fetch Kontrak (Contract expirations & renewals)
    const contracts = await db.kontrak.findMany({
      include: {
        tenant: { select: { nama: true } },
        kamar: { select: { nomorKamar: true } },
      },
    });

    return NextResponse.json({
      success: true,
      jadwalEvents,
      invoices,
      complaints,
      contracts,
    });
  } catch (error) {
    console.error('API /api/kalender GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
