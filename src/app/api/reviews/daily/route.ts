import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfDay, format } from 'date-fns';

const USER_ID = 'demo_user_001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const [reviews, total] = await Promise.all([
      db.dailyReview.findMany({
        where: { userId: USER_ID },
        orderBy: { reviewDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.dailyReview.count({ where: { userId: USER_ID } }),
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
    console.error('Error fetching daily reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily reviews' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reviewDate,
      summary,
      whatWentWell,
      mistakesMade,
      emotionalState,
      lessonLearned,
      tomorrowPlan,
    } = body;

    if (!reviewDate) {
      return NextResponse.json(
        { error: 'reviewDate is required' },
        { status: 400 },
      );
    }

    const dateOnly = startOfDay(new Date(reviewDate));

    // Upsert by userId + reviewDate (unique constraint)
    const review = await db.dailyReview.upsert({
      where: {
        userId_reviewDate: {
          userId: USER_ID,
          reviewDate: dateOnly,
        },
      },
      update: {
        summary,
        whatWentWell,
        mistakesMade,
        emotionalState,
        lessonLearned,
        tomorrowPlan,
      },
      create: {
        userId: USER_ID,
        reviewDate: dateOnly,
        summary,
        whatWentWell,
        mistakesMade,
        emotionalState,
        lessonLearned,
        tomorrowPlan,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating daily review:', error);
    return NextResponse.json(
      { error: 'Failed to create daily review' },
      { status: 500 },
    );
  }
}
