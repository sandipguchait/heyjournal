import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const review = await db.periodReview.findFirst({
      where: { id, userId: USER_ID },
    });

    if (!review) {
      return NextResponse.json({ error: 'Period review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching period review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch period review' },
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

    const existing = await db.periodReview.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Period review not found' }, { status: 404 });
    }

    const {
      endDate,
      performanceSummary,
      bestSetups,
      repeatedMistakes,
      ruleViolations,
      improvementPlan,
    } = body;

    const review = await db.periodReview.update({
      where: { id },
      data: {
        endDate: endDate ? new Date(endDate) : undefined,
        performanceSummary,
        bestSetups,
        repeatedMistakes,
        ruleViolations,
        improvementPlan,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating period review:', error);
    return NextResponse.json(
      { error: 'Failed to update period review' },
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
    const existing = await db.periodReview.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Period review not found' }, { status: 404 });
    }

    await db.periodReview.delete({ where: { id } });
    return NextResponse.json({ message: 'Period review deleted' });
  } catch (error) {
    console.error('Error deleting period review:', error);
    return NextResponse.json(
      { error: 'Failed to delete period review' },
      { status: 500 },
    );
  }
}
