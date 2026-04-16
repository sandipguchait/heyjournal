import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodType = searchParams.get('periodType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Record<string, unknown> = { userId: USER_ID };
    if (periodType) {
      where.periodType = periodType;
    }

    const [reviews, total] = await Promise.all([
      db.periodReview.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.periodReview.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching period reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch period reviews' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      periodType,
      startDate,
      endDate,
      performanceSummary,
      bestSetups,
      repeatedMistakes,
      ruleViolations,
      improvementPlan,
    } = body;

    if (!periodType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'periodType, startDate, and endDate are required' },
        { status: 400 },
      );
    }

    const validPeriodTypes = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validPeriodTypes.includes(periodType)) {
      return NextResponse.json(
        { error: `periodType must be one of: ${validPeriodTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Upsert by userId + periodType + startDate (unique constraint)
    const review = await db.periodReview.upsert({
      where: {
        userId_periodType_startDate: {
          userId: USER_ID,
          periodType,
          startDate: start,
        },
      },
      update: {
        endDate: end,
        performanceSummary,
        bestSetups,
        repeatedMistakes,
        ruleViolations,
        improvementPlan,
      },
      create: {
        userId: USER_ID,
        periodType,
        startDate: start,
        endDate: end,
        performanceSummary,
        bestSetups,
        repeatedMistakes,
        ruleViolations,
        improvementPlan,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating period review:', error);
    return NextResponse.json(
      { error: 'Failed to create period review' },
      { status: 500 },
    );
  }
}
