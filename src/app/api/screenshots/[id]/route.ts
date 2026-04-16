import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { imageUrl, label, sortOrder } = body;

    const existing = await db.tradeScreenshot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (label !== undefined) updateData.label = label;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const screenshot = await db.tradeScreenshot.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(screenshot);
  } catch (error) {
    console.error('Error updating screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to update screenshot' },
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
    const existing = await db.tradeScreenshot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 },
      );
    }

    await db.tradeScreenshot.delete({ where: { id } });
    return NextResponse.json({ message: 'Screenshot deleted' });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to delete screenshot' },
      { status: 500 },
    );
  }
}
