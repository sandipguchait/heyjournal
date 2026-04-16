import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const USER_ID = 'demo_user_001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const csvText = await file.text();
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

    // Expected columns (case-insensitive, spaces replaced with _)
    const requiredColumns = ['symbol', 'trade_date'];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 },
      );
    }

    // Map header indices
    const colIndex = (name: string) => headers.indexOf(name);

    const tradesToCreate: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every((v) => v.trim() === '')) continue;

      const get = (col: string) => {
        const idx = colIndex(col);
        return idx >= 0 ? values[idx]?.trim() : undefined;
      };

      const row = i + 1;

      const symbol = get('symbol');
      const tradeDateStr = get('trade_date');
      const direction = get('direction') || 'long';
      const entryPrice = parseFloat(get('entry_price') || '0');
      const exitPrice = get('exit_price') ? parseFloat(get('exit_price')!) : null;
      const quantity = parseFloat(get('quantity') || '1');
      const stopLoss = get('stop_loss') ? parseFloat(get('stop_loss')!) : null;
      const targetPrice = get('target_price') ? parseFloat(get('target_price')!) : null;
      const fees = parseFloat(get('fees') || '0');
      const strategy = get('strategy');
      const timeframe = get('timeframe');
      const marketType = get('market_type') || 'stocks';
      const accountName = get('account_name');
      const notes = get('notes');

      // Validate
      if (!symbol) {
        errors.push({ row, message: 'Missing symbol' });
        continue;
      }
      if (!tradeDateStr) {
        errors.push({ row, message: 'Missing trade_date' });
        continue;
      }

      const tradeDate = new Date(tradeDateStr);
      if (isNaN(tradeDate.getTime())) {
        errors.push({ row, message: `Invalid date: ${tradeDateStr}` });
        continue;
      }

      if (entryPrice <= 0) {
        errors.push({ row, message: 'entry_price must be positive' });
        continue;
      }

      // Calculate P/L
      let pnl: number | null = null;
      let pnlPercent: number | null = null;
      let rMultiple: number | null = null;

      if (exitPrice != null && !isNaN(exitPrice)) {
        if (direction === 'long') {
          pnl = (exitPrice - entryPrice) * quantity - fees;
        } else {
          pnl = (entryPrice - exitPrice) * quantity - fees;
        }
        pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        if (direction === 'short') pnlPercent = -pnlPercent;

        if (stopLoss != null && !isNaN(stopLoss) && stopLoss !== entryPrice) {
          const riskPerShare = Math.abs(entryPrice - stopLoss);
          const totalRisk = riskPerShare * quantity;
          if (totalRisk > 0) rMultiple = pnl / totalRisk;
        }
      }

      const riskAmount =
        stopLoss != null && !isNaN(stopLoss)
          ? Math.abs(entryPrice - stopLoss) * quantity
          : null;

      tradesToCreate.push({
        userId: USER_ID,
        symbol,
        marketType,
        direction,
        tradeDate,
        entryPrice,
        exitPrice: isNaN(exitPrice as number) ? null : exitPrice,
        quantity: isNaN(quantity) ? 1 : quantity,
        stopLoss: isNaN(stopLoss as number) ? null : stopLoss,
        targetPrice: isNaN(targetPrice as number) ? null : targetPrice,
        fees: isNaN(fees) ? 0 : fees,
        pnl,
        pnlPercent,
        riskAmount,
        rMultiple,
        strategy,
        timeframe,
        accountName,
        notes,
        status: exitPrice != null && !isNaN(exitPrice as number) ? 'closed' : 'open',
      });
    }

    if (tradesToCreate.length === 0) {
      return NextResponse.json(
        { error: 'No valid trades found in CSV', errors },
        { status: 400 },
      );
    }

    // Insert in batches of 50
    const batchSize = 50;
    let createdCount = 0;

    for (let i = 0; i < tradesToCreate.length; i += batchSize) {
      const batch = tradesToCreate.slice(i, i + batchSize);
      const result = await db.trade.createMany({ data: batch as never[] });
      createdCount += result.count;
    }

    return NextResponse.json({
      imported: createdCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json({ error: 'Failed to import trades' }, { status: 500 });
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
