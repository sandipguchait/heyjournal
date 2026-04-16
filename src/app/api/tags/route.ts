import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET() {
  try {
    const tags = await db.tradeTag.findMany({
      where: { userId: USER_ID },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { trades: true },
        },
      },
    });

    return NextResponse.json(tags.map((t) => ({
      id: t.id,
      name: t.name,
      tradeCount: t._count.trades,
    })));
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const existing = await db.tradeTag.findUnique({
      where: { userId_name: { userId: USER_ID, name: name.trim() } },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const tag = await db.tradeTag.create({
      data: {
        userId: USER_ID,
        name: name.trim(),
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
