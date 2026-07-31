import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react'
import { turnoverSupabase } from '@/lib/turnoverSupabase'

// Daily VA workflow: download the order report from Amazon Business, drop it
// here. Lands in the private `amazon-exports` bucket (turnover project); the
// burn engine's scheduled run picks up the newest file before building the
// day's restock snapshot.
const BUCKET = 'amazon-exports'

// Header columns the burn engine requires — checked client-side before upload
// so a wrong file (e.g. a returns report) is rejected with a clear message.
const REQUIRED_COLS = ['Order Date', 'Order ID', 'PO Number', 'Title', 'Item Quantity', 'ASIN']

function useLatestExport() {
  return useQuery({
    queryKey: ['amazonExports'],
    queryFn: async () => {
      if (!turnoverSupabase) return null
      const { data, error } = await turnoverSupabase.storage.from(BUCKET).list('', {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (error) throw error
      return data?.[0] ?? null
    },
    staleTime: 60 * 1000,
  })
}

export default function AmazonExportUpload({ onUploaded }: { onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { data: latest, isError: listError } = useLatestExport()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleFile(file: File) {
    setResult(null)
    if (!turnoverSupabase) {
      setResult({ ok: false, msg: 'Turnover Supabase connection not configured.' })
      return
    }
    setBusy(true)
    try {
      // validate the header line before uploading anything
      const head = await file.slice(0, 4096).text()
      const headerLine = head.replace(/^﻿/, '').split(/\r?\n/)[0] ?? ''
      const missing = REQUIRED_COLS.filter((c) => !headerLine.includes(c))
      if (missing.length) {
        setResult({
          ok: false,
          msg: `Doesn't look like the order report — missing: ${missing.join(', ')}. Make sure it's the Orders export from Business Analytics.`,
        })
        return
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const { error } = await turnoverSupabase.storage
        .from(BUCKET)
        .upload(`orders_${stamp}.csv`, file, { contentType: 'text/csv' })
      if (error) throw error

      setResult({ ok: true, msg: `Uploaded ${file.name} — refreshing the restock data now.` })
      queryClient.invalidateQueries({ queryKey: ['amazonExports'] })
      onUploaded?.() // kick an on-demand engine run so the panel catches up now
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      setResult({
        ok: false,
        msg: msg.toLowerCase().includes('bucket')
          ? 'Upload bucket not set up yet (apply 002_amazon_exports_bucket.sql).'
          : `Upload failed: ${msg}`,
      })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      className="bg-card-bg rounded-[12px] p-4 mb-5 flex flex-wrap items-center gap-3"
      style={{
        border: '1px solid rgba(123,124,248,0.22)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123,124,248,0.05)',
      }}
    >
      <div className="flex-1 min-w-[220px]">
        <div className="text-sm font-medium text-text-primary mb-0.5">Daily Amazon export</div>
        <div className="text-xs text-text-muted">
          {listError
            ? 'Upload bucket not reachable yet.'
            : latest?.created_at
              ? `Last upload ${formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}`
              : 'No exports uploaded yet — download the Orders report from Amazon Business and drop it here.'}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative flex items-center gap-1.5 px-4 py-2 rounded-[20px] font-medium text-sm text-white min-h-[40px] transition-all duration-200 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
        style={{
          background: 'rgba(123, 124, 248, 0.12)',
          border: '1.5px solid rgba(123, 124, 248, 0.8)',
          boxShadow: '0 0 10px rgba(123, 124, 248, 0.4), inset 0 0 10px rgba(123, 124, 248, 0.1)',
        }}
      >
        <Upload size={16} strokeWidth={1.5} />
        {busy ? 'Uploading…' : 'Upload report'}
      </button>

      {result && (
        <div className="w-full flex items-center gap-1.5 text-xs" style={{ color: result.ok ? '#34D399' : '#F87171' }}>
          {result.ok ? (
            <CheckCircle2 size={14} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={14} strokeWidth={1.5} />
          )}
          {result.msg}
        </div>
      )}
    </div>
  )
}
