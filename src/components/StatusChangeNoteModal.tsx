import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { STATUS_LABELS } from '@/lib/types'
import type { IssueStatus } from '@/lib/types'

interface StatusChangeNoteModalProps {
  open: boolean
  targetStatus: IssueStatus
  onConfirm: (note: string) => void
  onCancel: () => void
  isPending?: boolean
}

export default function StatusChangeNoteModal({
  open,
  targetStatus,
  onConfirm,
  onCancel,
  isPending,
}: StatusChangeNoteModalProps) {
  const [note, setNote] = useState('')

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-card-bg rounded-[12px] w-full max-w-[400px] p-5 space-y-3"
              style={{
                border: '1px solid rgba(123,124,248,0.35)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(123,124,248,0.15)',
              }}
            >
              <p className="text-sm text-text-secondary">
                Moving to <strong className="text-text-primary">{STATUS_LABELS[targetStatus]}</strong> — add a note:
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's happening?"
                className="rounded-[8px] min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onConfirm(note.trim()); setNote('') }}
                  disabled={!note.trim() || isPending}
                  className="rounded-[8px] min-h-[44px] sm:min-h-[36px] px-4 text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(123,124,248,0.14)',
                    color: '#9596FF',
                    border: '1.5px solid rgba(123,124,248,0.7)',
                    boxShadow: '0 0 8px rgba(123,124,248,0.35), inset 0 0 6px rgba(123,124,248,0.08)',
                  }}
                >
                  {isPending ? 'Saving…' : 'Confirm'}
                </button>
                <Button size="sm" variant="outline" onClick={onCancel} className="rounded-[8px] min-h-[44px] sm:min-h-0">
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
