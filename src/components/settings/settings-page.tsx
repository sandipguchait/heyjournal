'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DollarSign,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import type { MarketType } from '@/types';

// --- Constants ---

const MARKET_OPTIONS: { value: MarketType; label: string }[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
];

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

// --- Types ---

interface SettingsData {
  id: string;
  userId: string;
  defaultMarket: string;
  defaultTimezone: string;
  defaultCurrency: string;
  theme: string;
  notificationEnabled: boolean;
}

// --- Main Component ---

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Form state
  const [defaultMarket, setDefaultMarket] = useState<string>('stocks');
  const [defaultTimezone, setDefaultTimezone] = useState<string>('UTC');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');
  const [themeValue, setThemeValue] = useState<string>('system');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SettingsData = await res.json();

      setDefaultMarket(data.defaultMarket || 'stocks');
      setDefaultTimezone(data.defaultTimezone || 'UTC');
      setDefaultCurrency(data.defaultCurrency || 'USD');
      setThemeValue(data.theme || 'system');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Theme change handler
  const handleThemeChange = (newTheme: string) => {
    setThemeValue(newTheme);
    setTheme(newTheme as 'light' | 'dark' | 'system');
    setSaved(false);
  };

  // Save handler
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultMarket,
          defaultTimezone,
          defaultCurrency,
          theme: themeValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* === Page Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your trading journal preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* === Error Banner === */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* === Trading Preferences === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Trading Preferences
          </CardTitle>
          <CardDescription>Set your default trading configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Market */}
          <div className="space-y-2">
            <Label htmlFor="defaultMarket">Default Market</Label>
            <Select value={defaultMarket} onValueChange={(v) => { setDefaultMarket(v); setSaved(false); }}>
              <SelectTrigger id="defaultMarket" className="max-w-xs">
                <SelectValue placeholder="Select default market" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used as the default when adding new trades</p>
          </div>

          {/* Default Currency */}
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select value={defaultCurrency} onValueChange={(v) => { setDefaultCurrency(v); setSaved(false); }}>
              <SelectTrigger id="defaultCurrency" className="max-w-xs">
                <SelectValue placeholder="Select default currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Currency used for P/L calculations and display</p>
          </div>
        </CardContent>
      </Card>

      {/* === Regional Settings === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Regional Settings
          </CardTitle>
          <CardDescription>Configure timezone for your region</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Timezone */}
          <div className="space-y-2">
            <Label htmlFor="defaultTimezone">Default Timezone</Label>
            <Select value={defaultTimezone} onValueChange={(v) => { setDefaultTimezone(v); setSaved(false); }}>
              <SelectTrigger id="defaultTimezone" className="max-w-sm">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for date/time display in your journal</p>
          </div>
        </CardContent>
      </Card>

      {/* === Appearance === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={themeValue} onValueChange={handleThemeChange}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current: <span className="font-medium capitalize">{theme}</span>
              {theme === 'system' && (
                <span className="ml-1">(resolved: {typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'})</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
