import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = { userId: USER_ID };

    if (status) where.status = status;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.tradeDate = dateFilter;
    }

    const trades = await db.trade.findMany({
      where,
      orderBy: { tradeDate: 'asc' },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Build CSV
    const headers = [
      'Symbol',
      'Market Type',
      'Direction',
      'Trade Date',
      'Entry Time',
      'Exit Time',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'Stop Loss',
      'Target Price',
      'Fees',
      'P/L',
      'P/L %',
      'R Multiple',
      'Strategy',
      'Timeframe',
      'Account Name',
      'Status',
      'Setup Quality',
      'Confidence Rating',
      'Tags',
      'Notes',
      'Mistakes',
      'Lessons Learned',
    ];

    const rows = trades.map((t) => [
      t.symbol,
      t.marketType,
      t.direction,
      formatCSVDate(t.tradeDate),
      t.entryTime ? formatCSVDate(t.entryTime) : '',
      t.exitTime ? formatCSVDate(t.exitTime) : '',
      formatNumber(t.entryPrice),
      t.exitPrice != null ? formatNumber(t.exitPrice) : '',
      formatNumber(t.quantity),
      t.stopLoss != null ? formatNumber(t.stopLoss) : '',
      t.targetPrice != null ? formatNumber(t.targetPrice) : '',
      formatNumber(t.fees),
      t.pnl != null ? formatNumber(t.pnl) : '',
      t.pnlPercent != null ? formatNumber(t.pnlPercent) : '',
      t.rMultiple != null ? formatNumber(t.rMultiple) : '',
      t.strategy || '',
      t.timeframe || '',
      t.accountName || '',
      t.status,
      t.setupQuality != null ? String(t.setupQuality) : '',
      t.confidenceRating != null ? String(t.confidenceRating) : '',
      t.tags.map((tt) => tt.tag.name).join('; '),
      escapeCSVField(t.notes || ''),
      escapeCSVField(t.mistakes || ''),
      escapeCSVField(t.lessonsLearned || ''),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hejournal-trades-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting trades:', error);
    return NextResponse.json({ error: 'Failed to export trades' }, { status: 500 });
  }
}

function formatCSVDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatNumber(num: number): string {
  return num.toFixed(2);
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
