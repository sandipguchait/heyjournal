'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Globe,
  IndianRupee,
  Save,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

// --- Constants ---

const MARKET_OPTIONS = [
  { value: 'equity', label: 'Equity (NSE/BSE)' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
  { value: 'commodity', label: 'Commodity (MCX)' },
  { value: 'currency', label: 'Currency (NSE)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - Indian Standard Time)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR - Indian Rupee (₹)' },
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
];



interface SettingsData {
  id: string;
  userId: string;
  defaultMarket: string;
  defaultTimezone: string;
  defaultCurrency: string;
  theme: string;
  notificationEnabled: boolean;
}

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';
const darkInput = 'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary/50';

export default function SettingsPage() {
  const [defaultMarket, setDefaultMarket] = useState<string>('equity');
  const [defaultTimezone, setDefaultTimezone] = useState<string>('Asia/Kolkata');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('INR');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SettingsData = await res.json();
      setDefaultMarket(data.defaultMarket || 'equity');
      setDefaultTimezone(data.defaultTimezone || 'Asia/Kolkata');
      setDefaultCurrency(data.defaultCurrency || 'INR');

    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load settings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);



  const handleSave = async () => {
    try {
      setSaving(true); setError(null); setSaved(false);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultMarket, defaultTimezone, defaultCurrency }),
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `HTTP ${res.status}`); }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><LoadingSpinner className="w-8 h-8" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your trading journal preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Trading Preferences */}
      <div className={cn(darkCard, 'space-y-6')}>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Trading Preferences</p>
              <p className="text-xs text-muted-foreground">Set your default trading configuration</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Market</Label>
          <Select value={defaultMarket} onValueChange={(v) => { setDefaultMarket(v); setSaved(false); }}>
            <SelectTrigger className={cn(darkInput, 'max-w-xs')}>
              <SelectValue placeholder="Select default market" />
            </SelectTrigger>
            <SelectContent>
              {MARKET_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used as the default when adding new trades</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Currency</Label>
          <Select value={defaultCurrency} onValueChange={(v) => { setDefaultCurrency(v); setSaved(false); }}>
            <SelectTrigger className={cn(darkInput, 'max-w-xs')}>
              <SelectValue placeholder="Select default currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Currency used for P/L calculations and display</p>
        </div>
      </div>

      {/* Regional Settings */}
      <div className={cn(darkCard, 'space-y-6')}>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Regional Settings</p>
              <p className="text-xs text-muted-foreground">Configure timezone for your region</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Timezone</Label>
          <Select value={defaultTimezone} onValueChange={(v) => { setDefaultTimezone(v); setSaved(false); }}>
            <SelectTrigger className={cn(darkInput, 'max-w-sm')}>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for date/time display in your journal</p>
        </div>
      </div>

      {/* Indian Rupee info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        <IndianRupee className="w-4 h-4 text-primary/60" />
        <span>Heyjournal is optimized for Indian stock markets (NSE/BSE) with INR (₹) as the default currency and IST timezone.</span>
      </div>
    </div>
  );
}
