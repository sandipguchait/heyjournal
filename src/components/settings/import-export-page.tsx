'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner, ErrorState } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

// --- Import Constants ---

const TRADE_FIELDS = [
  { value: 'symbol', label: 'Symbol' },
  { value: 'trade_date', label: 'Trade Date' },
  { value: 'direction', label: 'Direction' },
  { value: 'entry_price', label: 'Entry Price' },
  { value: 'exit_price', label: 'Exit Price' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'stop_loss', label: 'Stop Loss' },
  { value: 'target_price', label: 'Target Price' },
  { value: 'fees', label: 'Fees' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'timeframe', label: 'Timeframe' },
  { value: 'market_type', label: 'Market Type' },
  { value: 'account_name', label: 'Account Name' },
  { value: 'notes', label: 'Notes' },
  { value: 'status', label: 'Status' },
];

interface ImportError { row: number; message: string; }
interface ImportResult { imported: number; errors?: ImportError[]; }

const darkCard = 'bg-[#161618] rounded-xl border border-white/[0.06] p-5';
const darkInput = 'bg-white/[0.03] border-white/[0.08] rounded-lg focus:border-primary/50';

export default function ImportExportPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          Import / Export
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Import trades from CSV or export your journal data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportSection />
        <ExportSection />
      </div>
    </div>
  );
}

// --- Import Section ---

function ImportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseCSVFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n');
        if (lines.length < 2) { setParseError('CSV must have a header row and at least one data row'); return; }
        const headers = parseCSVLine(lines[0]);
        setCsvHeaders(headers);
        const previewRows = lines.slice(1, 6).map((line) => parseCSVLine(line));
        setCsvPreview(previewRows);
        const mappings: Record<string, string> = {};
        headers.forEach((header, index) => {
          const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
          const match = TRADE_FIELDS.find((field) => field.value === normalized);
          if (match) mappings[index.toString()] = match.value;
        });
        setFieldMappings(mappings);
        setParseError(null); setImportResult(null);
      } catch { setParseError('Failed to parse CSV file'); }
    };
    reader.readAsText(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.csv')) { setParseError('Please select a CSV file'); return; }
    setFile(selected);
    parseCSVFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.name.endsWith('.csv')) { setFile(dropped); parseCSVFile(dropped); }
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      setImporting(true); setImportResult(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `HTTP ${res.status}`); }
      const data: ImportResult = await res.json();
      setImportResult(data);
    } catch (err) { setImportResult({ imported: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : 'Import failed' }] }); }
    finally { setImporting(false); }
  };

  const handleReset = () => {
    setFile(null); setCsvHeaders([]); setCsvPreview([]); setFieldMappings({});
    setImportResult(null); setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 h-fit">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Upload className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Import Trades</p>
          <p className="text-xs text-muted-foreground">Import trades from a CSV file</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {!file ? (
          <div
            className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click or drag a CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">Required columns: symbol, trade_date</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB &middot; {csvHeaders.length} columns</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">Remove</Button>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
              </div>
            )}

            {csvHeaders.length > 0 && !parseError && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Field Mapping</Label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {csvHeaders.map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-lg min-w-[100px] truncate flex-1" title={header}>{header}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <Select value={fieldMappings[index.toString()] || '__none__'} onValueChange={(v) => {
                        setFieldMappings((prev) => { const next = { ...prev }; if (v === '__none__') delete next[index.toString()]; else next[index.toString()] = v; return next; });
                      }}>
                        <SelectTrigger className={cn(darkInput, 'h-8 text-xs flex-1 max-w-[200px]')}><SelectValue placeholder="Skip" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Skip column</SelectItem>
                          {TRADE_FIELDS.map((field) => (<SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {csvPreview.length > 0 && !parseError && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview (first {csvPreview.length} rows)</Label>
                <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/[0.06] bg-white/[0.03]">
                        {csvHeaders.map((header, i) => (<TableHead key={i} className="text-xs font-mono whitespace-nowrap px-2 py-1.5 h-9">{header}</TableHead>))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, ri) => (
                        <TableRow key={ri} className="border-white/[0.04] hover:bg-white/[0.03]">
                          {row.map((cell, ci) => (<TableCell key={ci} className="text-xs py-1 px-2 whitespace-nowrap max-w-[150px] truncate">{cell}</TableCell>))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {importResult && (
              <div className="space-y-3">
                <Separator className="bg-white/[0.06]" />
                {importResult.imported > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm font-medium text-emerald-400">Successfully imported {importResult.imported} trade{importResult.imported !== 1 ? 's' : ''}</p>
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-400"><XCircle className="w-4 h-4" /> {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}</div>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {importResult.errors.map((err, i) => (<p key={i} className="text-xs text-muted-foreground">Row {err.row}: {err.message}</p>))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleImport} disabled={importing || !file || !!parseError} className="flex-1 bg-primary text-primary-foreground rounded-xl">
                {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button variant="outline" onClick={handleReset} className="bg-white/[0.05] border-white/[0.08] rounded-xl">Reset</Button>
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-white/[0.06]">
          <p className="font-medium">Required CSV format:</p>
          <code className="block bg-white/[0.03] border border-white/[0.06] p-2 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-nowrap">
            symbol,trade_date,direction,entry_price,exit_price,quantity,stop_loss,target_price,fees,strategy,timeframe,market_type,account_name,notes
          </code>
          <p className="mt-1">Only <Badge className="bg-primary/15 text-primary text-[10px] h-4 px-1 border-0">symbol</Badge> and <Badge className="bg-primary/15 text-primary text-[10px] h-4 px-1 border-0">trade_date</Badge> are required.</p>
        </div>
      </div>
    </div>
  );
}

// --- Export Section ---

function ExportSection() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setDateFrom(format(thirtyDaysAgo, 'yyyy-MM-dd'));
    setDateTo(format(now, 'yyyy-MM-dd'));
  }, []);

  const handleExport = async (exportType: 'all' | 'dateRange') => {
    try {
      setExporting(true); setExportError(null);
      let url = '/api/export?';
      if (exportType === 'dateRange' && dateFrom) url += `dateFrom=${dateFrom}&`;
      if (exportType === 'dateRange' && dateTo) url += `dateTo=${dateTo}&`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition');
      let filename = `hejournal-trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      if (contentDisposition) { const match = contentDisposition.match(/filename="?([^"]+)"?/); if (match) filename = match[1]; }
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="bg-[#161618] rounded-xl border border-white/[0.06] p-5 h-fit">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Export Trades</p>
          <p className="text-xs text-muted-foreground">Download your trades as a CSV file</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Export All Trades</Label>
          <p className="text-xs text-muted-foreground">Download all your trades including open, closed, and draft entries.</p>
          <Button variant="outline" className="w-full justify-center gap-2 bg-white/[0.05] border-white/[0.08] rounded-xl hover:bg-white/[0.08]" onClick={() => handleExport('all')} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export All Trades
          </Button>
        </div>

        <Separator className="bg-white/[0.06]" />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Export by Date Range</Label>
          <p className="text-xs text-muted-foreground">Download trades within a specific date range.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exportFrom" className="text-xs text-muted-foreground">From</Label>
              <Input id="exportFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={darkInput} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exportTo" className="text-xs text-muted-foreground">To</Label>
              <Input id="exportTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={darkInput} />
            </div>
          </div>
          <Button className="w-full justify-center gap-2 bg-primary text-primary-foreground rounded-xl" onClick={() => handleExport('dateRange')} disabled={exporting || !dateFrom || !dateTo}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Date Range
          </Button>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {exportError}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-white/[0.06]">
          <p className="font-medium">Export includes:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Trade details (symbol, prices, quantities, P/L)</li>
            <li>Strategy, timeframe, and account information</li>
            <li>Tags, notes, mistakes, and lessons learned</li>
            <li>Entry/exit times when available</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- CSV Parser ---

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { current += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { result.push(current); current = ''; }
      else { current += char; }
    }
  }
  result.push(current);
  return result;
}
