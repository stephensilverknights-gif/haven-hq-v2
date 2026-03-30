import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import UserAvatar from '@/components/UserAvatar'
import StatusBadge from '@/components/StatusBadge'
import { useActivityLog, useAddNote } from '@/hooks/useActivityLog'
import { useAuth } from '@/contexts/AuthContext'
import type { IssueStatus } from '@/lib/types'

interface ActivityLogProps {
  issueId: string
}

export default function ActivityLog({ issueId }: ActivityLogProps) {
  const { user } = useAuth()
  const { data: entries, isLoading } = useActivityLog(issueId)
  const addNote = useAddNote()
  const [newNote, setNewNote] = useState('')

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return

    await addNote.mutateAsync({
      issueId,
      userId: user.id,
      note: newNote.trim(),
    })
    setNewNote('')
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Activity
      </h3>

      {/* Add note input */}
      <div className="flex gap-2 mb-4">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="rounded-[8px] min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddNote()
            }
          }}
        />
        <Button
          onClick={handleAddNote}
          disabled={!newNote.trim() || addNote.isPending}
          size="sm"
          className="rounded-[8px] shrink-0 self-end min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          style={{ backgroundColor: '#7B7CF8' }}
        >
          <Send size={14} strokeWidth={1.5} />
        </Button>
      </div>

      {/* Log entries */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <div className="space-y-0">
          {entries?.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
              className="relative flex gap-3 pb-4"
            >
              {/* Timeline line */}
              {i < (entries?.length ?? 0) - 1 && (
                <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
              )}

              {entry.user && (
                <UserAvatar initials={entry.user.initials} size="sm" className="mt-0.5 shrink-0 z-[1]" />
              )}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-text-primary">
                    {entry.user?.name}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>

                {entry.status_from && entry.status_to && (
                  <div className="flex items-center gap-1.5 mb-1.5 p-1.5 bg-surface rounded-[6px] w-fit">
                    <StatusBadge status={entry.status_from as IssueStatus} />
                    <ArrowRight size={11} className="text-text-muted shrink-0" />
                    <StatusBadge status={entry.status_to as IssueStatus} />
                  </div>
                )}

                <p className="text-[13px] text-text-secondary leading-relaxed">{entry.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
