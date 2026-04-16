import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET() {
  try {
    // Ensure user exists (demo user)
    let user = await db.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: USER_ID,
          name: 'Demo User',
          email: 'demo@hejournal.com',
        },
      });
    }

    let settings = await db.userSettings.findUnique({
      where: { userId: USER_ID },
    });

    if (!settings) {
      settings = await db.userSettings.create({
        data: { userId: USER_ID },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      defaultMarket,
      defaultTimezone,
      defaultCurrency,
      theme,
      notificationEnabled,
    } = body;

    // Ensure user exists
    let user = await db.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: USER_ID,
          name: 'Demo User',
          email: 'demo@hejournal.com',
        },
      });
    }

    const settings = await db.userSettings.upsert({
      where: { userId: USER_ID },
      update: {
        ...(defaultMarket !== undefined && { defaultMarket }),
        ...(defaultTimezone !== undefined && { defaultTimezone }),
        ...(defaultCurrency !== undefined && { defaultCurrency }),
        ...(theme !== undefined && { theme }),
        ...(notificationEnabled !== undefined && { notificationEnabled }),
      },
      create: {
        userId: USER_ID,
        ...(defaultMarket && { defaultMarket }),
        ...(defaultTimezone && { defaultTimezone }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(theme && { theme }),
        ...(notificationEnabled !== undefined && { notificationEnabled }),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
