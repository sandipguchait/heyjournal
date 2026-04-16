// Application types and interfaces

export type MarketType = 'stocks' | 'forex' | 'crypto' | 'futures' | 'options';
export type Direction = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'draft';
export type ScreenshotLabel = 'pre-entry' | 'entry' | 'exit' | 'review';
export type PeriodType = 'weekly' | 'monthly';
export type EmotionalState = 'calm' | 'confident' | 'anxious' | 'fearful' | 'greedy' | 'frustrated' | 'excited' | 'neutral';

export interface TradeFormData {
  id?: string;
  symbol: string;
  marketType: MarketType;
  direction: Direction;
  tradeDate: string;
  entryTime?: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss?: number;
  targetPrice?: number;
  fees: number;
  pnl?: number;
  pnlPercent?: number;
  riskAmount?: number;
  rMultiple?: number;
  strategy?: string;
  timeframe?: string;
  accountName?: string;
  broker?: string;
  setupQuality?: number;
  confidenceRating?: number;
  emotionalStateBefore?: EmotionalState;
  emotionalStateAfter?: EmotionalState;
  notes?: string;
  mistakes?: string;
  lessonsLearned?: string;
  status: TradeStatus;
  tagIds?: string[];
}

export interface DailyReviewFormData {
  id?: string;
  reviewDate: string;
  summary?: string;
  whatWentWell?: string;
  mistakesMade?: string;
  emotionalState?: EmotionalState;
  lessonLearned?: string;
  tomorrowPlan?: string;
}

export interface PeriodReviewFormData {
  id?: string;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  performanceSummary?: string;
  bestSetups?: string;
  repeatedMistakes?: string;
  ruleViolations?: string;
  improvementPlan?: string;
}

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  strategy?: string;
  marketType?: MarketType;
  direction?: Direction;
  tags?: string[];
  profitable?: 'winners' | 'losers';
  status?: TradeStatus;
  accountName?: string;
}

export interface TradeSort {
  field: 'tradeDate' | 'pnl' | 'symbol' | 'strategy';
  order: 'asc' | 'desc';
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  strategy?: string;
  symbol?: string;
  accountName?: string;
  tagId?: string;
  marketType?: MarketType;
}

export interface AnalyticsPeriod {
  type: 'weekly' | 'monthly' | 'annual';
}

export interface KPICards {
  todayPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  winRate: number;
  totalTrades: number;
}

export interface PnLDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
}

export interface AnalyticsMetrics {
  winRate: number;
  avgWinner: number;
  avgLoser: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  totalTrades: number;
  totalPnl: number;
}

export interface DayPerformance {
  day: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
}

export interface StrategyPerformance {
  name: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface TimePerformance {
  hour: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
}

export interface CalendarDay {
  date: string;
  pnl: number;
  tradeCount: number;
  hasReview: boolean;
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ImportResult {
  success: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface AppSettings {
  defaultMarket: MarketType;
  defaultTimezone: string;
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  notificationEnabled: boolean;
}
