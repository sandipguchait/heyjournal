import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

function calculateTradeFields(data: {
  direction: string;
  entryPrice: number;
  exitPrice?: number | null;
  quantity: number;
  stopLoss?: number | null;
  fees: number;
}) {
  const { direction, entryPrice, exitPrice, quantity, stopLoss, fees } = data;

  let pnl: number | null = null;
  let pnlPercent: number | null = null;
  let rMultiple: number | null = null;

  if (exitPrice != null) {
    if (direction === 'long') {
      pnl = (exitPrice - entryPrice) * quantity - fees;
    } else {
      pnl = (entryPrice - exitPrice) * quantity - fees;
    }
    pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    if (direction === 'short') {
      pnlPercent = -pnlPercent;
    }

    if (stopLoss != null && stopLoss !== entryPrice) {
      const riskPerShare = Math.abs(entryPrice - stopLoss);
      const totalRisk = riskPerShare * quantity;
      if (totalRisk > 0) {
        rMultiple = pnl / totalRisk;
      }
    }
  }

  return { pnl, pnlPercent, rMultiple };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const trade = await db.trade.findFirst({
      where: { id, userId: USER_ID },
      include: {
        screenshots: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...trade,
      tags: trade.tags.map((tt) => tt.tag),
    });
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.trade.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const {
      symbol,
      marketType,
      direction,
      tradeDate,
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      quantity,
      stopLoss,
      targetPrice,
      fees,
      strategy,
      timeframe,
      accountName,
      broker,
      setupQuality,
      confidenceRating,
      emotionalStateBefore,
      emotionalStateAfter,
      notes,
      mistakes,
      lessonsLearned,
      status,
      tagIds,
    } = body;

    const finalDirection = direction ?? existing.direction;
    const finalEntryPrice = entryPrice ?? existing.entryPrice;
    const finalExitPrice = exitPrice ?? existing.exitPrice;
    const finalQuantity = quantity ?? existing.quantity;
    const finalStopLoss = stopLoss ?? existing.stopLoss;
    const finalFees = fees ?? existing.fees;

    const calcFields = calculateTradeFields({
      direction: finalDirection,
      entryPrice: finalEntryPrice,
      exitPrice: finalExitPrice,
      quantity: finalQuantity,
      stopLoss: finalStopLoss,
      fees: finalFees,
    });

    const riskAmount =
      finalStopLoss != null
        ? Math.abs(finalEntryPrice - finalStopLoss) * finalQuantity
        : null;

    const updateData: Record<string, unknown> = {
      symbol,
      marketType,
      direction,
      tradeDate: tradeDate ? new Date(tradeDate) : undefined,
      entryTime: entryTime ? new Date(entryTime) : null,
      exitTime: exitTime ? new Date(exitTime) : null,
      entryPrice,
      exitPrice: finalExitPrice,
      quantity,
      stopLoss: finalStopLoss,
      targetPrice,
      fees,
      pnl: calcFields.pnl,
      pnlPercent: calcFields.pnlPercent,
      riskAmount,
      rMultiple: calcFields.rMultiple,
      strategy,
      timeframe,
      accountName,
      broker,
      setupQuality,
      confidenceRating,
      emotionalStateBefore,
      emotionalStateAfter,
      notes,
      mistakes,
      lessonsLearned,
      status,
    };

    // Remove undefined fields
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    // Handle tag updates
    if (tagIds !== undefined) {
      await db.tradeTagMap.deleteMany({ where: { tradeId: id } });
      updateData.tags = {
        create: tagIds.map((tagId: string) => ({ tagId })),
      };
    }

    const trade = await db.trade.update({
      where: { id },
      data: updateData,
      include: {
        screenshots: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      ...trade,
      tags: trade.tags.map((tt) => tt.tag),
    });
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await db.trade.findFirst({
      where: { id, userId: USER_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    await db.trade.delete({ where: { id } });
    return NextResponse.json({ message: 'Trade deleted' });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
