import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tradeId = searchParams.get('tradeId');

    if (!tradeId) {
      return NextResponse.json(
        { error: 'tradeId query parameter is required' },
        { status: 400 },
      );
    }

    const screenshots = await db.tradeScreenshot.findMany({
      where: { tradeId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(screenshots);
  } catch (error) {
    console.error('Error fetching screenshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screenshots' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tradeId, imageUrl, label = 'entry', sortOrder = 0 } = body;

    if (!tradeId || !imageUrl) {
      return NextResponse.json(
        { error: 'tradeId and imageUrl are required' },
        { status: 400 },
      );
    }

    // Verify the trade exists
    const trade = await db.trade.findFirst({ where: { id: tradeId } });
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const screenshot = await db.tradeScreenshot.create({
      data: { tradeId, imageUrl, label, sortOrder },
    });

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error('Error creating screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to create screenshot' },
      { status: 500 },
    );
  }
}
