'use client';

import { cn } from '@/lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('animate-spin rounded-full h-6 w-6 border-b-2 border-primary', className)} />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function BadgePnl({ value, className }: { value: number; className?: string }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium text-sm',
        isPositive && 'text-emerald-600 dark:text-emerald-400',
        !isPositive && !isZero && 'text-red-600 dark:text-red-400',
        isZero && 'text-muted-foreground',
        className
      )}
    >
      {isPositive ? '+' : ''}{value.toFixed(2)}
    </span>
  );
}

export function CurrencyBadge({ value, className }: { value: number; className?: string }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold',
        isPositive && 'text-emerald-600 dark:text-emerald-400',
        !isPositive && !isZero && 'text-red-600 dark:text-red-400',
        isZero && 'text-muted-foreground',
        className
      )}
    >
      {isPositive ? '+$' : isZero ? '$' : '-$'}
      {Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

export function formatCurrency(value: number): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
