// Demo user ID for local development
export const DEMO_USER_ID = 'demo_user_001';

// Default settings for demo user (Indian market)
export const DEFAULT_SETTINGS = {
  defaultMarket: 'stocks',
  defaultTimezone: 'Asia/Kolkata',
  defaultCurrency: 'INR',
  theme: 'dark' as const,
  notificationEnabled: true,
};

// Timeframe options
export const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'] as const;

// Strategy presets (Indian market focused)
export const STRATEGY_PRESETS = [
  'Breakout',
  'Pullback',
  'Trend Following',
  'Mean Reversion',
  'Scalping',
  'Swing Trade',
  'Momentum',
  'Support/Resistance',
  'VWAP Strategy',
  'Gap Up/Down',
  'Opening Range Breakout',
  'Fibonacci Retracement',
  'Olam High-Low',
  'Renko Chart',
  'Candlestick Pattern',
] as const;

// Indian broker presets
export const BROKER_PRESETS = [
  'Zerodha',
  'Groww',
  'Angel One',
  'Upstox',
  'ICICI Direct',
  'HDFC Securities',
  'Kotak Securities',
  'Motilal Oswal',
  '5paisa',
  'Sharekhan',
  'Edelweiss',
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

// Market type options (Indian market focused)
export const MARKET_TYPES = [
  { value: 'equity', label: 'Equity (NSE/BSE)' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
  { value: 'commodity', label: 'Commodity (MCX)' },
  { value: 'currency', label: 'Currency (NSE)' },
] as const;

// Screenshot label options
export const SCREENSHOT_LABELS = [
  { value: 'pre-entry', label: 'Pre-Entry' },
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
  { value: 'review', label: 'Review' },
] as const;

// Indian stock presets for autocomplete
export const INDIAN_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'HINDUNILVR',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK',
  'BAJFINANCE', 'MARUTI', 'TITAN', 'SUNPHARMA', 'ASIANPAINT',
  'WIPRO', 'HCLTECH', 'ONGC', 'NTPC', 'POWERGRID', 'TATAMOTORS',
  'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'HINDALCO', 'COALINDIA',
  'ULTRACEMCO', 'NESTLEIND', 'TECHM', 'BAJAJFINSV', 'DRREDDY',
  'CIPLA', 'DIVISLAB', 'EICHERMOT', 'HEROMOTOCO', 'M&M',
  'BPCL', 'IOC', 'GRASIM', 'INDUSINDBK', 'TATACONSUM',
  'NIFTY 50', 'BANKNIFTY', 'FINNIFTY',
] as const;

// Currency formatter (Indian Rupee with ₹ symbol, Indian number formatting)
export function formatCurrency(value: number, currency = 'INR'): string {
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'INR') {
    return value < 0 ? `-₹${formatted}` : `₹${formatted}`;
  }
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

// Number formatter (Indian number system)
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
