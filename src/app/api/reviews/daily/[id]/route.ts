import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const review = await db.dailyReview.findFirst({
      where: { id, userId: USER_ID },
    });

    if (!review) {
      return NextResponse.json({ error: 'Daily review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching daily review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily review' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.dailyReview.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Daily review not found' }, { status: 404 });
    }

    const {
      summary,
      whatWentWell,
      mistakesMade,
      emotionalState,
      lessonLearned,
      tomorrowPlan,
    } = body;

    const review = await db.dailyReview.update({
      where: { id },
      data: { summary, whatWentWell, mistakesMade, emotionalState, lessonLearned, tomorrowPlan },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating daily review:', error);
    return NextResponse.json(
      { error: 'Failed to update daily review' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await db.dailyReview.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Daily review not found' }, { status: 404 });
    }

    await db.dailyReview.delete({ where: { id } });
    return NextResponse.json({ message: 'Daily review deleted' });
  } catch (error) {
    console.error('Error deleting daily review:', error);
    return NextResponse.json(
      { error: 'Failed to delete daily review' },
      { status: 500 },
    );
  }
}
