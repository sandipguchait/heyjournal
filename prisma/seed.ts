import { PrismaClient } from '@prisma/client';
import { subDays, startOfWeek, startOfMonth } from 'date-fns';

const prisma = new PrismaClient();

const DEMO_USER_ID = 'demo_user_001';

async function main() {
  console.log('Seeding database with Indian market data...');

  // Clean existing data
  await prisma.tradeTagMap.deleteMany({ where: { trade: { userId: DEMO_USER_ID } } });
  await prisma.tradeScreenshot.deleteMany({ where: { trade: { userId: DEMO_USER_ID } } });
  await prisma.trade.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.periodReview.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.dailyReview.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.tradeTag.deleteMany({ where: { userId: DEMO_USER_ID } });

  // Create demo user
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      name: 'Indian Trader',
      email: 'demo@heyjournal.com',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
    create: {
      id: DEMO_USER_ID,
      name: 'Indian Trader',
      email: 'demo@heyjournal.com',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  // Create user settings
  await prisma.userSettings.upsert({
    where: { userId: DEMO_USER_ID },
    update: {},
    create: {
      userId: DEMO_USER_ID,
      defaultMarket: 'equity',
      defaultTimezone: 'Asia/Kolkata',
      defaultCurrency: 'INR',
      theme: 'dark',
      notificationEnabled: true,
    },
  });

  // Create tags (Indian market specific)
  const tagNames = ['Gap Up', 'Breakout', 'Earnings', 'News Based', 'Technical', 'Momentum', 'Reversal', 'High Volume'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tradeTag.upsert({
      where: { userId_name: { userId: DEMO_USER_ID, name } },
      update: {},
      create: { userId: DEMO_USER_ID, name },
    });
    tags[name] = tag.id;
  }

  const today = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;

  // 10 carefully crafted Indian stock market trades
  const tradesData = [
    {
      symbol: 'RELIANCE', direction: 'long', entryPrice: 2945.50, exitPrice: 2998.75, quantity: 50,
      stopLoss: 2920.00, targetPrice: 3010.00, fees: 53.20, strategy: 'Breakout', timeframe: '15m',
      accountName: 'Main Account', broker: 'Zerodha', setupQuality: 4, confidenceRating: 4,
      emotionalStateBefore: 'confident', emotionalStateAfter: 'confident',
      notes: 'Reliance broke above 2940 resistance with strong volume. Entry was clean on the 15-min chart after a pullback to VWAP. Oil prices were supportive.',
      tagNames: ['Breakout', 'High Volume'], daysAgo: 0,
    },
    {
      symbol: 'TCS', direction: 'long', entryPrice: 3892.00, exitPrice: 3845.30, quantity: 25,
      stopLoss: 3860.00, targetPrice: 3950.00, fees: 48.50, strategy: 'Pullback', timeframe: '1h',
      accountName: 'Main Account', broker: 'Zerodha', setupQuality: 3, confidenceRating: 3,
      emotionalStateBefore: 'calm', emotionalStateAfter: 'frustrated',
      notes: 'TCS pulled back to 20 EMA on hourly chart. IT sector was showing weakness due to US Fed concerns. Exit was at stop loss as price continued lower.',
      mistakes: 'Should have waited for confirmation candle before entry. IT sector was showing overall weakness.',
      tagNames: ['Technical'], daysAgo: 1,
    },
    {
      symbol: 'HDFCBANK', direction: 'long', entryPrice: 1678.25, exitPrice: 1725.80, quantity: 150,
      stopLoss: 1660.00, targetPrice: 1745.00, fees: 73.10, strategy: 'VWAP Strategy', timeframe: '5m',
      accountName: 'Main Account', broker: 'Zerodha', setupQuality: 5, confidenceRating: 5,
      emotionalStateBefore: 'confident', emotionalStateAfter: 'excited',
      notes: 'HDFC Bank gave a perfect VWAP bounce on 5-min chart. Banking sector was strong after RBI policy announcement. Large position size due to high confidence.',
      lessonsLearned: 'VWAP bounces in trending sectors give the best risk-reward. Stick to these setups.',
      tagNames: ['Momentum', 'High Volume'], daysAgo: 2,
    },
    {
      symbol: 'NIFTY 50', direction: 'short', entryPrice: 22450.00, exitPrice: 22310.50, quantity: 25,
      stopLoss: 22500.00, targetPrice: 22200.00, fees: 62.00, strategy: 'Opening Range Breakout', timeframe: '15m',
      accountName: 'Options Account', broker: 'Zerodha', setupQuality: 4, confidenceRating: 4,
      emotionalStateBefore: 'calm', emotionalStateAfter: 'confident',
      notes: 'Nifty showed weakness at opening after negative global cues. Shorted the opening range breakdown below 22450 with proper SL above previous day high.',
      tagNames: ['Gap Up', 'Technical'], daysAgo: 3,
    },
    {
      symbol: 'TATAMOTORS', direction: 'long', entryPrice: 658.40, exitPrice: 682.15, quantity: 200,
      stopLoss: 648.00, targetPrice: 695.00, fees: 41.30, strategy: 'Momentum', timeframe: '30m',
      accountName: 'Main Account', broker: 'Groww', setupQuality: 4, confidenceRating: 3,
      emotionalStateBefore: 'anxious', emotionalStateAfter: 'excited',
      notes: 'Tata Motors was showing strong momentum after JLR sales numbers. Entered on pullback to 20 EMA. Volume was above average.',
      tagNames: ['Momentum', 'News Based'], daysAgo: 4,
    },
    {
      symbol: 'INFY', direction: 'short', entryPrice: 1578.90, exitPrice: 1595.40, quantity: 100,
      stopLoss: 1560.00, targetPrice: 1545.00, fees: 39.90, strategy: 'Mean Reversion', timeframe: '1h',
      accountName: 'Main Account', broker: 'Zerodha', setupQuality: 2, confidenceRating: 2,
      emotionalStateBefore: 'greedy', emotionalStateAfter: 'frustrated',
      notes: 'Tried to short Infosys at resistance but it broke through with strong buying. Should not have counter-trend traded.',
      mistakes: 'Entered against the trend. Did not wait for proper reversal confirmation. Greedy entry hoping for quick profit.',
      lessonsLearned: 'Do not counter-trend trade unless there is a clear reversal pattern with volume confirmation.',
      tagNames: ['Reversal'], daysAgo: 5,
    },
    {
      symbol: 'SBIN', direction: 'long', entryPrice: 782.50, exitPrice: 812.75, quantity: 300,
      stopLoss: 770.00, targetPrice: 825.00, fees: 47.10, strategy: 'Breakout', timeframe: '15m',
      accountName: 'Main Account', broker: 'Angel One', setupQuality: 4, confidenceRating: 4,
      emotionalStateBefore: 'calm', emotionalStateAfter: 'confident',
      notes: 'SBI broke out of a 3-day consolidation with massive volume. PSU banking sector was in focus. Entered on breakout and held till target.',
      tagNames: ['Breakout', 'High Volume'], daysAgo: 7,
    },
    {
      symbol: 'BANKNIFTY', direction: 'long', entryPrice: 48950.00, exitPrice: 48720.00, quantity: 15,
      stopLoss: 48800.00, targetPrice: 49200.00, fees: 33.75, strategy: 'Trend Following', timeframe: '5m',
      accountName: 'Options Account', broker: 'Zerodha', setupQuality: 3, confidenceRating: 3,
      emotionalStateBefore: 'neutral', emotionalStateAfter: 'frustrated',
      notes: 'Bank Nifty showed initial strength but reversed sharply after RBI deputy governor speech. Small loss due to tight stop loss.',
      mistakes: 'Should have waited for the event to pass before entering. RBI events cause high volatility in banking sector.',
      tagNames: ['Technical', 'News Based'], daysAgo: 8,
    },
    {
      symbol: 'ICICIBANK', direction: 'long', entryPrice: 1085.30, exitPrice: 1124.60, quantity: 200,
      stopLoss: 1072.00, targetPrice: 1140.00, fees: 54.20, strategy: 'Support/Resistance', timeframe: '30m',
      accountName: 'Main Account', broker: 'Zerodha', setupQuality: 5, confidenceRating: 5,
      emotionalStateBefore: 'confident', emotionalStateAfter: 'excited',
      notes: 'ICICI Bank took support exactly at 1080 level (previous swing low + 50 DMA). Beautiful bounce with volume. Banking sector was strong post-results.',
      lessonsLearned: 'Support-resistance bounces at confluence zones (50 DMA + swing low) give highest probability trades.',
      tagNames: ['Technical', 'Momentum'], daysAgo: 9,
    },
    {
      symbol: 'ITC', direction: 'short', entryPrice: 462.75, exitPrice: 455.30, quantity: 500,
      stopLoss: 470.00, targetPrice: 445.00, fees: 58.50, strategy: 'Candlestick Pattern', timeframe: '1h',
      accountName: 'Main Account', broker: 'Upstox', setupQuality: 4, confidenceRating: 4,
      emotionalStateBefore: 'calm', emotionalStateAfter: 'confident',
      notes: 'ITC formed a bearish engulfing pattern on the hourly chart at resistance. FMCG sector was weak. Clean entry with target achieved in 2 hours.',
      tagNames: ['Technical', 'Reversal'], daysAgo: 10,
    },
  ];

  // Insert trades
  const createdTrades = [];
  for (const td of tradesData) {
    const tradeDate = subDays(today, td.daysAgo);
    tradeDate.setHours(tradeDate.getHours() + 5, tradeDate.getMinutes() + 30); // IST

    const entryHour = 9 + Math.floor(Math.random() * 5);
    const entryMin = Math.floor(Math.random() * 60);
    const exitHour = entryHour + 1 + Math.floor(Math.random() * 4);
    const exitMin = Math.floor(Math.random() * 60);

    const entryTime = new Date(tradeDate);
    entryTime.setHours(entryHour, entryMin, 0, 0);
    const exitTime = new Date(tradeDate);
    exitTime.setHours(Math.min(exitHour, 15), exitMin, 0, 0);

    const pnl = td.direction === 'long'
      ? Math.round(((td.exitPrice - td.entryPrice) * td.quantity - td.fees) * 100) / 100
      : Math.round(((td.entryPrice - td.exitPrice) * td.quantity - td.fees) * 100) / 100;

    const pnlPercent = Math.round(((td.exitPrice - td.entryPrice) / td.entryPrice) * 100 * 100) / 100 * (td.direction === 'long' ? 1 : -1);

    const risk = Math.abs(td.entryPrice - td.stopLoss) * td.quantity;
    const rMultiple = risk > 0 ? Math.round((pnl / risk) * 100) / 100 : 0;

    const trade = await prisma.trade.create({
      data: {
        userId: DEMO_USER_ID,
        symbol: td.symbol,
        marketType: ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY'].includes(td.symbol) ? 'futures' : 'equity',
        direction: td.direction,
        tradeDate,
        entryTime,
        exitTime,
        entryPrice: td.entryPrice,
        exitPrice: td.exitPrice,
        quantity: td.quantity,
        stopLoss: td.stopLoss,
        targetPrice: td.targetPrice,
        fees: td.fees,
        pnl,
        pnlPercent,
        riskAmount: Math.round(risk * 100) / 100,
        rMultiple,
        strategy: td.strategy,
        timeframe: td.timeframe,
        accountName: td.accountName,
        broker: td.broker,
        setupQuality: td.setupQuality,
        confidenceRating: td.confidenceRating,
        emotionalStateBefore: td.emotionalStateBefore,
        emotionalStateAfter: td.emotionalStateAfter,
        notes: td.notes,
        mistakes: td.mistakes || null,
        lessonsLearned: td.lessonsLearned || null,
        status: 'closed',
      },
    });
    createdTrades.push({ trade, tagNames: td.tagNames });
  }

  // Create tag mappings
  for (const { trade, tagNames: tNames } of createdTrades) {
    for (const name of tNames) {
      if (tags[name]) {
        await prisma.tradeTagMap.create({
          data: { tradeId: trade.id, tagId: tags[name] },
        });
      }
    }
  }

  // Create a few daily reviews
  const reviewEntries = [
    {
      daysAgo: 0,
      summary: 'Good trading day. Reliance breakout trade worked well. Followed the plan and maintained discipline.',
      whatWentWell: 'Waited for the breakout confirmation. Did not chase the trade. Exit was at target.',
      mistakesMade: null,
      emotionalState: 'confident',
      lessonLearned: 'Patience at key resistance levels is rewarded.',
      tomorrowPlan: 'Watch for TCS and Infosys earnings reaction. Focus on banking sector momentum.',
    },
    {
      daysAgo: 1,
      summary: 'Mixed day. TCS trade was a loss but managed risk well with stop loss.',
      whatWentWell: 'Followed stop loss strictly. No revenge trading after the loss.',
      mistakesMade: 'TCS entry was premature without confirmation candle.',
      emotionalState: 'calm',
      lessonLearned: 'Wait for confirmation before entering pullback trades in weak sectors.',
      tomorrowPlan: 'Focus on strong sectors only. Avoid IT sector till clarity emerges.',
    },
    {
      daysAgo: 2,
      summary: 'Excellent day! HDFC Bank VWAP bounce was textbook. Large profits with well-managed risk.',
      whatWentWell: 'Identified the VWAP bounce early. Scaled into the position as confidence grew.',
      mistakesMade: null,
      emotionalState: 'excited',
      lessonLearned: 'VWAP + trend + volume = high probability setup. Increase size on these.',
      tomorrowPlan: 'Review RBI policy impact on banking stocks. Look for follow-through trades.',
    },
  ];

  for (const rev of reviewEntries) {
    const reviewDate = subDays(today, rev.daysAgo);
    await prisma.dailyReview.upsert({
      where: { userId_reviewDate: { userId: DEMO_USER_ID, reviewDate: reviewDate } },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        reviewDate,
        summary: rev.summary,
        whatWentWell: rev.whatWentWell,
        mistakesMade: rev.mistakesMade,
        emotionalState: rev.emotionalState,
        lessonLearned: rev.lessonLearned,
        tomorrowPlan: rev.tomorrowPlan,
      },
    });
  }

  // Create one weekly review
  const weekEnd = subDays(today, 0);
  const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
  await prisma.periodReview.upsert({
    where: {
      userId_periodType_startDate: { userId: DEMO_USER_ID, periodType: 'weekly', startDate: weekStart },
    },
    update: {},
    create: {
      userId: DEMO_USER_ID,
      periodType: 'weekly',
      startDate: weekStart,
      endDate: weekEnd,
      performanceSummary: 'Good week overall with 70% win rate. Best trades were HDFC Bank VWAP bounce and SBI breakout. Need to avoid counter-trend trades.',
      bestSetups: 'HDFC Bank VWAP bounce, SBI breakout, Reliance resistance breakout',
      repeatedMistakes: 'Counter-trend entries without confirmation (INFY short)',
      ruleViolations: null,
      improvementPlan: 'Focus only on trend-following setups. Avoid mean reversion in strong trends. Wait for confirmation candles.',
    },
  });

  console.log('Seed data created successfully!');
  console.log('   - 10 Indian stock market trades');
  console.log('   - 8 tags');
  console.log('   - 3 daily reviews');
  console.log('   - 1 weekly review');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
