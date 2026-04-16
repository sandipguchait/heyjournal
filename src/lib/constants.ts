// Demo user ID for local development
export const DEMO_USER_ID = 'demo_user_001';

// Default settings for demo user
export const DEFAULT_SETTINGS = {
  defaultMarket: 'stocks',
  defaultTimezone: 'America/New_York',
  defaultCurrency: 'USD',
  theme: 'system' as const,
  notificationEnabled: true,
};

// Timeframe options
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'] as const;

// Strategy presets
export const STRATEGY_PRESETS = [
  'Breakout',
  'Pullback',
  'Trend Following',
  'Mean Reversion',
  'Scalping',
  'Swing Trade',
  'Momentum',
  'Support/Resistance',
  'VWAP',
  'Gap Fill',
  'Opening Range',
  'Fibonacci',
  'Ichimoku',
  'Price Action',
] as const;

// Broker presets
export const BROKER_PRESETS = [
  'Interactive Brokers',
  'TD Ameritrade',
  'E*TRADE',
  'Fidelity',
  'Robinhood',
  'Webull',
  'Thinkorswim',
  'Coinbase',
  'Binance',
  'Bybit',
  'Other',
] as const;

// Emotional state options
export const EMOTIONAL_STATES = [
  'calm',
  'confident',
  'anxious',
  'fearful',
  'greedy',
  'frustrated',
  'excited',
  'neutral',
] as const;

// Market type options
export const MARKET_TYPES = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
] as const;

// Screenshot label options
export const SCREENSHOT_LABELS = [
  { value: 'pre-entry', label: 'Pre-Entry' },
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
  { value: 'review', label: 'Review' },
] as const;

// Currency formatter
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Percentage formatter
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// Number formatter
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Calculate P/L
export function calculatePnL(
  entryPrice: number,
  exitPrice: number | null,
  quantity: number,
  direction: 'long' | 'short',
  fees: number = 0
): number | null {
  if (exitPrice === null) return null;
  let pnl: number;
  if (direction === 'long') {
    pnl = (exitPrice - entryPrice) * quantity - fees;
  } else {
    pnl = (entryPrice - exitPrice) * quantity - fees;
  }
  return Math.round(pnl * 100) / 100;
}

// Calculate P/L percentage
export function calculatePnLPercent(
  entryPrice: number,
  exitPrice: number | null,
  direction: 'long' | 'short'
): number | null {
  if (exitPrice === null || entryPrice === 0) return null;
  let pct: number;
  if (direction === 'long') {
    pct = ((exitPrice - entryPrice) / entryPrice) * 100;
  } else {
    pct = ((entryPrice - exitPrice) / entryPrice) * 100;
  }
  return Math.round(pct * 100) / 100;
}

// Calculate R-multiple
export function calculateRMultiple(
  entryPrice: number,
  exitPrice: number | null,
  stopLoss: number | null,
  direction: 'long' | 'short'
): number | null {
  if (exitPrice === null || stopLoss === null) return null;
  let risk: number;
  if (direction === 'long') {
    risk = entryPrice - stopLoss;
    if (risk <= 0) return null;
    return Math.round(((exitPrice - entryPrice) / risk) * 100) / 100;
  } else {
    risk = stopLoss - entryPrice;
    if (risk <= 0) return null;
    return Math.round(((entryPrice - exitPrice) / risk) * 100) / 100;
  }
}
