import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine target userId for query
    // Owner queries notifications with userId = null (general/owner) or specifically for owner.id
    // Tenant queries notifications specifically for tenant.id
    let whereClause = {};
    if (user.role === 'OWNER') {
      whereClause = {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      };
    } else {
      whereClause = {
        userId: user.id
      };
    }

    // Fetch notifications
    const notifications = await prisma.notifikasi.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 latest
    });

    // Count unread
    const unreadCount = await prisma.notifikasi.count({
      where: {
        ...whereClause,
        dibaca: false
      }
    });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId, all } = body;

    let whereClause: any = {};
    if (user.role === 'OWNER') {
      whereClause = {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      };
    } else {
      whereClause = {
        userId: user.id
      };
    }

    if (all) {
      // Mark all as read
      await prisma.notifikasi.updateMany({
        where: {
          ...whereClause,
          dibaca: false
        },
        data: {
          dibaca: true
        }
      });
    } else if (notificationId) {
      // Mark single notification as read, ensuring ownership/accessibility
      await prisma.notifikasi.updateMany({
        where: {
          id: notificationId,
          ...whereClause
        },
        data: {
          dibaca: true
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications read API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
