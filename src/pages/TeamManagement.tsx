import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCheck,
  UserX,
  ShieldCheck,
  Shield,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TopNav from '@/components/TopNav'
import UserAvatar from '@/components/UserAvatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

// ── Hooks ───────────────────────────────────────────────────────────────────

function useAllProfiles() {
  return useQuery<Profile[]>({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Member Row ──────────────────────────────────────────────────────────────

function MemberRow({
  member,
  currentUserId,
  index,
  onUpdate,
}: {
  member: Profile
  currentUserId: string
  index: number
  onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const isSelf = member.id === currentUserId

  const handleToggleApproval = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ approved: !member.approved })
      .eq('id', member.id)
    setSaving(false)
    onUpdate()
  }

  const handleToggleAdmin = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ is_training_admin: !member.is_training_admin })
      .eq('id', member.id)
    setSaving(false)
    onUpdate()
  }

  const handleSetRepTarget = async (target: number) => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ daily_rep_target: target })
      .eq('id', member.id)
    setSaving(false)
    onUpdate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] border transition-colors text-left cursor-pointer',
          expanded
            ? 'bg-surface border-haven-indigo/20'
            : 'bg-card-bg border-border hover:bg-surface-hover'
        )}
      >
        <UserAvatar initials={member.initials} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {member.name}
            </span>
            {isSelf && (
              <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-secondary">
              {member.is_training_admin ? 'Admin' : 'Team Member'}
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {member.approved ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-watch-text/10 text-watch-text border border-watch-text/20">
              Active
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-urgent-text/10 text-urgent-text border border-urgent-text/20">
              Pending
            </span>
          )}
          {member.is_training_admin && (
            <ShieldCheck size={14} className="text-haven-indigo" />
          )}
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-text-muted transition-transform duration-200 shrink-0',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-4 space-y-4">
              {/* Approval */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-text-secondary">Access</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {member.approved ? 'User can access the app' : 'User is waiting for approval'}
                  </p>
                </div>
                <button
                  onClick={handleToggleApproval}
                  disabled={saving || isSelf}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    member.approved
                      ? 'text-urgent-text border-urgent-text/30 hover:bg-urgent-text/10'
                      : 'text-watch-text border-watch-text/30 hover:bg-watch-text/10'
                  )}
                >
                  {member.approved ? (
                    <>
                      <UserX size={13} /> Revoke
                    </>
                  ) : (
                    <>
                      <UserCheck size={13} /> Approve
                    </>
                  )}
                </button>
              </div>

              {/* Admin toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-text-secondary">Admin Access</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {member.is_training_admin
                      ? 'Can manage scenarios, imports, and team'
                      : 'Standard user access only'}
                  </p>
                </div>
                <button
                  onClick={handleToggleAdmin}
                  disabled={saving || isSelf}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    member.is_training_admin
                      ? 'text-haven-indigo border-haven-indigo/30 hover:bg-haven-indigo/10'
                      : 'text-text-muted border-border hover:bg-surface-hover'
                  )}
                >
                  {member.is_training_admin ? (
                    <>
                      <ShieldCheck size={13} /> Admin
                    </>
                  ) : (
                    <>
                      <Shield size={13} /> Make Admin
                    </>
                  )}
                </button>
              </div>

              {/* Daily Rep Target */}
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">
                  Daily Rep Target: {member.daily_rep_target}
                </p>
                <div className="flex items-center gap-2">
                  {[3, 5, 10, 15, 20].map((target) => (
                    <button
                      key={target}
                      onClick={() => handleSetRepTarget(target)}
                      disabled={saving}
                      className={cn(
                        'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50',
                        member.daily_rep_target === target
                          ? 'bg-haven-indigo/15 text-haven-indigo border-haven-indigo/30'
                          : 'text-text-muted border-border hover:bg-surface-hover'
                      )}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta */}
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-text-muted">
                  Joined {new Date(member.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function TeamManagement() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: members, isLoading } = useAllProfiles()

  const pendingCount = members?.filter((m) => !m.approved).length ?? 0
  const activeCount = members?.filter((m) => m.approved).length ?? 0

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['allProfiles'] })
    queryClient.invalidateQueries({ queryKey: ['teamProfiles'] })
  }

  // Admin gate
  if (profile && !profile.is_training_admin) {
    return (
      <div className="h-screen flex flex-col bg-page-bg">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary text-sm">Admin access required.</p>
            <button
              onClick={() => navigate('/training')}
              className="mt-3 text-sm text-haven-indigo hover:underline cursor-pointer"
            >
              Back to Training
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav />

      <main className="flex-1 overflow-y-auto themed-scroll">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => navigate('/admin')}
                className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-xl font-semibold text-text-primary">Team Management</h2>
            </div>
            <p className="text-sm text-text-secondary ml-[30px]">
              {activeCount} active{pendingCount > 0 ? ` \u00B7 ${pendingCount} pending approval` : ''}
            </p>
          </motion.div>

          {/* Pending Approvals Section */}
          {pendingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-urgent-text">Pending Approval</h3>
                <span className="text-xs text-urgent-text bg-urgent-text/10 px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {members
                  ?.filter((m) => !m.approved)
                  .map((m, i) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      currentUserId={profile?.id ?? ''}
                      index={i}
                      onUpdate={handleUpdate}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {/* Active Members */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-text-secondary">Active Members</h3>
              <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-text-secondary text-sm">Loading team...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {members
                  ?.filter((m) => m.approved)
                  .map((m, i) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      currentUserId={profile?.id ?? ''}
                      index={i}
                      onUpdate={handleUpdate}
                    />
                  ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
