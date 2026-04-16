import { PrismaClient } from '@prisma/client';
import { addDays, subDays, format, startOfWeek, startOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

const DEMO_USER_ID = 'demo_user_001';

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      name: 'Demo Trader',
      email: 'demo@heyjournal.com',
      timezone: 'America/New_York',
      currency: 'USD',
    },
  });

  // Create user settings
  await prisma.userSettings.upsert({
    where: { userId: DEMO_USER_ID },
    update: {},
    create: {
      userId: DEMO_USER_ID,
      defaultMarket: 'stocks',
      defaultTimezone: 'America/New_York',
      defaultCurrency: 'USD',
      theme: 'system',
      notificationEnabled: true,
    },
  });

  // Create tags
  const tagNames = ['Gap Up', 'Earnings', 'News', 'Technical', 'Momentum', 'Reversal', 'Oversold', 'Overbought'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tradeTag.upsert({
      where: { userId_name: { userId: DEMO_USER_ID, name } },
      update: {},
      create: { userId: DEMO_USER_ID, name },
    });
    tags[name] = tag.id;
  }

  // Generate trades for the past 90 days
  const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'AMD', 'NFLX', 'DIS'];
  const strategies = ['Breakout', 'Pullback', 'Trend Following', 'Mean Reversion', 'Scalping', 'Swing Trade', 'Momentum'];
  const timeframes = ['5m', '15m', '1h', '4h', '1D'];
  const emotions = ['calm', 'confident', 'anxious', 'excited', 'neutral', 'frustrated'];
  const brokers = ['Interactive Brokers', 'TD Ameritrade', 'E*TRADE', 'Robinhood'];
  const accounts = ['Main', 'Paper Trading', 'Swing Account'];

  const today = new Date();
  const tradesToCreate: any[] = [];

  for (let i = 0; i < 90; i++) {
    const date = subDays(today, i);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    // 1-5 trades per day
    const tradesPerDay = Math.floor(Math.random() * 5) + 1;
    for (let j = 0; j < tradesPerDay; j++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const direction = Math.random() > 0.45 ? 'long' : 'short';
      const entryPrice = Math.round((Math.random() * 400 + 50) * 100) / 100;
      const priceChange = (Math.random() - 0.4) * entryPrice * 0.04;
      const exitPrice = Math.round((entryPrice + priceChange) * 100) / 100;
      const quantity = Math.floor(Math.random() * 100) + 1;
      const fees = Math.round(quantity * 0.01 * 100) / 100;
      const pnl = direction === 'long'
        ? Math.round(((exitPrice - entryPrice) * quantity - fees) * 100) / 100
        : Math.round(((entryPrice - exitPrice) * quantity - fees) * 100) / 100;
      const pnlPercent = Math.round(((exitPrice - entryPrice) / entryPrice) * 100 * 100) / 100 * (direction === 'long' ? 1 : -1);
      const stopLoss = direction === 'long'
        ? Math.round((entryPrice - entryPrice * 0.02) * 100) / 100
        : Math.round((entryPrice + entryPrice * 0.02) * 100) / 100;
      const risk = Math.abs(entryPrice - stopLoss) * quantity;
      const rMultiple = risk > 0 ? Math.round((pnl / risk) * 100) / 100 : 0;
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      const entryHour = 9 + Math.floor(Math.random() * 7);
      const entryMin = Math.floor(Math.random() * 60);
      const exitHour = entryHour + Math.floor(Math.random() * 3);
      const exitMin = Math.floor(Math.random() * 60);

      const tradeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const entryTime = new Date(tradeDate);
      entryTime.setHours(entryHour, entryMin);
      const exitTime = new Date(tradeDate);
      exitTime.setHours(Math.min(exitHour, 16), exitMin);

      tradesToCreate.push({
        userId: DEMO_USER_ID,
        symbol,
        marketType: 'stocks',
        direction,
        tradeDate,
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        quantity,
        stopLoss,
        targetPrice: direction === 'long'
          ? Math.round((entryPrice + entryPrice * 0.03) * 100) / 100
          : Math.round((entryPrice - entryPrice * 0.03) * 100) / 100,
        fees,
        pnl,
        pnlPercent,
        riskAmount: Math.round(risk * 100) / 100,
        rMultiple,
        strategy,
        timeframe,
        accountName: accounts[Math.floor(Math.random() * accounts.length)],
        broker: brokers[Math.floor(Math.random() * brokers.length)],
        setupQuality: Math.floor(Math.random() * 5) + 1,
        confidenceRating: Math.floor(Math.random() * 5) + 1,
        emotionalStateBefore: emotions[Math.floor(Math.random() * emotions.length)],
        emotionalStateAfter: emotions[Math.floor(Math.random() * emotions.length)],
        notes: i < 5 ? 'Good setup on the 15min chart with volume confirmation. Entry was clean with minimal slippage.' : null,
        mistakes: Math.random() > 0.7 ? 'Moved stop loss too early' : null,
        lessonsLearned: Math.random() > 0.7 ? 'Trust the setup and let winners run' : null,
        status: 'closed',
      });
    }
  }

  // Insert trades in batches
  console.log(`📊 Creating ${tradesToCreate.length} trades...`);
  for (let i = 0; i < tradesToCreate.length; i += 50) {
    const batch = tradesToCreate.slice(i, i + 50);
    await prisma.trade.createMany({ data: batch });
  }

  // Get all trades for tagging
  const allTrades = await prisma.trade.findMany({
    where: { userId: DEMO_USER_ID },
    select: { id: true },
  });

  // Assign random tags to trades (deduplicated)
  const tagMappings = Object.entries(tags);
  const tagMapSet = new Set<string>();
  const tagMapData: { tradeId: string; tagId: string }[] = [];
  for (const trade of allTrades) {
    const numTags = Math.floor(Math.random() * 3);
    const usedTags = new Set<string>();
    for (let t = 0; t < numTags; t++) {
      const [_, tagId] = tagMappings[Math.floor(Math.random() * tagMappings.length)];
      const key = `${trade.id}-${tagId}`;
      if (!tagMapSet.has(key) && !usedTags.has(tagId)) {
        tagMapSet.add(key);
        usedTags.add(tagId);
        tagMapData.push({ tradeId: trade.id, tagId });
      }
    }
  }

  if (tagMapData.length > 0) {
    console.log(`🏷️ Creating ${tagMapData.length} tag mappings...`);
    for (let i = 0; i < tagMapData.length; i += 100) {
      const batch = tagMapData.slice(i, i + 100);
      await prisma.tradeTagMap.createMany({ data: batch });
    }
  }

  // Create daily reviews for the past 30 days
  const reviewEmotions = ['calm', 'confident', 'anxious', 'neutral', 'frustrated', 'excited'];
  for (let i = 1; i <= 30; i++) {
    const reviewDate = subDays(today, i);
    const dayOfWeek = reviewDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    await prisma.dailyReview.upsert({
      where: { userId_reviewDate: { userId: DEMO_USER_ID, reviewDate: reviewDate } },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        reviewDate,
        summary: i < 3 ? 'Overall good trading day. Followed the plan and managed risk well.' : null,
        whatWentWell: i < 5 ? 'Stayed disciplined with stop losses. Did not chase trades.' : null,
        mistakesMade: Math.random() > 0.6 ? 'Took a revenge trade after a loss. Need to stick to the plan.' : null,
        emotionalState: reviewEmotions[Math.floor(Math.random() * reviewEmotions.length)],
        lessonLearned: Math.random() > 0.5 ? 'Patience pays off. Wait for the right setup.' : null,
        tomorrowPlan: Math.random() > 0.4 ? 'Focus on pullback setups in trending stocks. Review NVDA levels.' : null,
      },
    });
  }

  // Create period reviews (weekly for past 8 weeks, monthly for past 4 months)
  for (let w = 0; w < 8; w++) {
    const endDate = subDays(today, w * 7);
    const startDate = startOfWeek(endDate, { weekStartsOn: 1 });
    await prisma.periodReview.upsert({
      where: {
        userId_periodType_startDate: { userId: DEMO_USER_ID, periodType: 'weekly', startDate },
      },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        periodType: 'weekly',
        startDate,
        endDate,
        performanceSummary: w < 2 ? 'Strong week with 65% win rate. Best performing strategy was breakout trades.' : null,
        bestSetups: w < 3 ? 'TSLA breakout, NVDA pullback' : null,
        repeatedMistakes: w < 4 ? 'Moving stop loss too early on winning trades' : null,
        ruleViolations: Math.random() > 0.5 ? 'Entered a trade without confirmation' : null,
        improvementPlan: Math.random() > 0.4 ? 'Focus on holding winners longer. Implement trailing stops.' : null,
      },
    });
  }

  for (let m = 0; m < 4; m++) {
    const endDate = subMonths(today, m);
    const startDate = startOfMonth(endDate);
    await prisma.periodReview.upsert({
      where: {
        userId_periodType_startDate: { userId: DEMO_USER_ID, periodType: 'monthly', startDate },
      },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        periodType: 'monthly',
        startDate,
        endDate,
        performanceSummary: m < 2 ? 'Solid month overall. Improved consistency compared to previous month. Win rate up to 58%.' : null,
        bestSetups: m < 3 ? 'AAPL momentum, QQQ breakout trades' : null,
        repeatedMistakes: m < 3 ? 'Overtrading on low-confidence setups' : null,
        ruleViolations: Math.random() > 0.5 ? 'Risked more than 2% on single trades' : null,
        improvementPlan: Math.random() > 0.4 ? 'Reduce position sizes on lower-confidence setups. Review trade journal daily.' : null,
      },
    });
  }

  console.log('✅ Seed data created successfully!');
  console.log(`   - ${tradesToCreate.length} trades`);
  console.log(`   - ${tagNames.length} tags`);
  console.log(`   - 8 weekly reviews`);
  console.log(`   - 4 monthly reviews`);
  console.log(`   - ~20 daily reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
