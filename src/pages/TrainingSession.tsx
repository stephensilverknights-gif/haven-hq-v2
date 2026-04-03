import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronDown, Send, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTrainingSession,
  useUpdateTrainingSession,
  useEndTrainingSession,
  callTrainingChat,
} from '@/hooks/useTraining'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/training-types'
import type { ChatMessage, Difficulty } from '@/lib/training-types'
import { cn } from '@/lib/utils'

const GUEST_SYSTEM_PROMPT_TEMPLATE = `You are roleplaying as an upset guest at Haven by Design Stays, a premium short-term rental company.

SITUATION: {brief}
YOUR PERSONALITY: {guest_persona}

BEHAVIOR RULES:
- Stay fully in character at all times. Never break character.
- Keep responses 2-4 sentences. Real guests don't write essays.
- ESCALATE if the response is: generic, policy-hiding, apology-only, or vague.
- SOFTEN slightly only when: genuine empathy is shown AND a specific action with a timeframe is offered.
- NEVER accept vague promises. Push for specifics.
- If a genuinely excellent resolution is offered, you may indicate satisfaction.
- Do NOT resolve the issue prematurely.
- Respond ONLY as the guest. No stage directions. No narration.`

export default function TrainingSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: session, isLoading: sessionLoading } = useTrainingSession(id)
  const updateSession = useUpdateTrainingSession()
  const endSession = useEndTrainingSession()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openerLoaded, setOpenerLoaded] = useState(false)
  const [briefExpanded, setBriefExpanded] = useState(true)
  const [exchangeCount, setExchangeCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initRef = useRef(false)

  const scenario = session?.scenario
  const dailyRepTarget = profile?.daily_rep_target ?? 10

  // Build system prompt from scenario
  const systemPrompt = scenario
    ? GUEST_SYSTEM_PROMPT_TEMPLATE.replace('{brief}', scenario.brief).replace(
        '{guest_persona}',
        scenario.guest_persona
      )
    : ''

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isGenerating, scrollToBottom])

  // Load existing messages from session or generate opener
  useEffect(() => {
    if (!session || !scenario || initRef.current) return
    initRef.current = true

    const existingMessages = (session.transcript ?? []) as ChatMessage[]
    if (existingMessages.length > 0) {
      setMessages(existingMessages)
      setExchangeCount(session.exchange_count ?? 0)
      setOpenerLoaded(true)
      return
    }

    // Generate opener
    generateOpener()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, scenario])

  const generateOpener = async () => {
    if (!scenario || !id) return
    setIsGenerating(true)
    setError(null)

    try {
      const content = await callTrainingChat({
        system_prompt: systemPrompt,
        messages: [],
        is_opener: true,
      })

      const guestMessage: ChatMessage = {
        role: 'guest',
        content,
        timestamp: new Date().toISOString(),
      }

      setMessages([guestMessage])
      setOpenerLoaded(true)

      // Persist
      await updateSession.mutateAsync({
        id,
        transcript: [guestMessage],
        exchange_count: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isGenerating || !id || !scenario) return

    setInputValue('')
    setError(null)

    // Add trainee message
    const traineeMessage: ChatMessage = {
      role: 'trainee',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...messages, traineeMessage]
    setMessages(updatedMessages)

    // Generate guest response
    setIsGenerating(true)
    try {
      const content = await callTrainingChat({
        system_prompt: systemPrompt,
        messages: updatedMessages,
        is_opener: false,
      })

      const guestMessage: ChatMessage = {
        role: 'guest',
        content,
        timestamp: new Date().toISOString(),
      }

      const allMessages = [...updatedMessages, guestMessage]
      const newExchangeCount = exchangeCount + 1
      setMessages(allMessages)
      setExchangeCount(newExchangeCount)

      // Persist
      await updateSession.mutateAsync({
        id,
        transcript: allMessages,
        exchange_count: newExchangeCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEndSession = async () => {
    if (!id || !session || !scenario || !profile) return

    try {
      await endSession.mutateAsync({
        session_id: id,
        trainee_id: profile.id,
        scenario,
        daily_rep_target: dailyRepTarget,
      })
      navigate('/training')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
    }
  }

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  if (sessionLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-page-bg">
        <p className="text-text-secondary">Loading session...</p>
      </div>
    )
  }

  if (!session || !scenario) {
    return (
      <div className="h-screen flex items-center justify-center bg-page-bg">
        <p className="text-text-secondary">Session not found.</p>
      </div>
    )
  }

  const difficulty = scenario.difficulty as Difficulty
  const diffColors = DIFFICULTY_COLORS[difficulty]
  const canEnd = exchangeCount >= 3

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      {/* Top Bar */}
      <header className="sticky top-0 z-30">
        <div
          className="absolute inset-0 bg-card-bg/70 backdrop-blur-xl"
          style={{ borderBottom: '1px solid rgba(123, 124, 248, 0.08)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(123, 124, 248, 0.4) 25%, rgba(123, 124, 248, 0.6) 50%, rgba(123, 124, 248, 0.4) 75%, transparent 95%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          {/* Left: Back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/training')}
              className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-[8px] text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {scenario.title}
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border shrink-0',
                  diffColors.bg,
                  diffColors.text,
                  diffColors.border
                )}
              >
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            </div>
          </div>

          {/* Right: exchange count + end button */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleEndSession}
              disabled={!canEnd || endSession.isPending}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-[8px] transition-all duration-200',
                canEnd
                  ? 'text-haven-indigo hover:bg-haven-indigo/10 border border-haven-indigo/30'
                  : 'text-text-muted border border-border cursor-not-allowed'
              )}
              title={canEnd ? 'End session and return' : 'Complete at least 3 exchanges first'}
            >
              {endSession.isPending ? 'Ending...' : 'End & Score'}
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Scenario Brief */}
          <div className="mb-4 bg-surface rounded-[10px] border border-border overflow-hidden">
            <button
              onClick={() => setBriefExpanded(!briefExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Scenario Brief
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                className={cn(
                  'text-text-muted transition-transform duration-200',
                  briefExpanded ? 'rotate-0' : '-rotate-90'
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {briefExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-sm text-text-primary leading-relaxed">
                      {scenario.brief}
                    </p>
                    {scenario.property && (
                      <p className="text-xs text-text-muted">
                        Property: {scenario.property}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'flex flex-col max-w-[85%] sm:max-w-[75%]',
                  msg.role === 'guest' ? 'self-start' : 'self-end'
                )}
              >
                <span
                  className={cn(
                    'text-xs text-text-muted mb-1',
                    msg.role === 'trainee' && 'text-right'
                  )}
                >
                  {msg.role === 'guest' ? 'Guest' : 'You'}
                </span>
                <div
                  className={cn(
                    'px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'guest'
                      ? 'bg-card-bg border border-border rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px]'
                      : 'bg-haven-indigo/10 border border-haven-indigo/20 rounded-tl-[10px] rounded-bl-[10px] rounded-br-[10px]'
                  )}
                >
                  <p className="text-text-primary whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col max-w-[85%] sm:max-w-[75%] self-start"
                >
                  <span className="text-xs text-text-muted mb-1">Guest</span>
                  <div className="bg-card-bg border border-border rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typing-dot_1.2s_0ms_infinite_ease-in-out]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typing-dot_1.2s_200ms_infinite_ease-in-out]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typing-dot_1.2s_400ms_infinite_ease-in-out]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-fire-bg border border-fire-border rounded-[10px] p-3 flex items-start gap-2"
                >
                  <AlertCircle size={16} className="text-fire-text shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-fire-text">{error}</p>
                    <button
                      onClick={() => {
                        setError(null)
                        if (!openerLoaded) {
                          generateOpener()
                        }
                      }}
                      className="text-xs text-fire-text underline mt-1"
                    >
                      Retry
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="border-t border-border bg-card-bg px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            disabled={isGenerating || !openerLoaded}
            rows={1}
            className="flex-1 bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-haven-indigo/50 focus:border-haven-indigo/50 disabled:opacity-50 transition-colors"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating || !openerLoaded}
            className={cn(
              'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-[8px] transition-all duration-200',
              inputValue.trim() && !isGenerating
                ? 'text-haven-indigo hover:bg-haven-indigo/10'
                : 'text-text-muted cursor-not-allowed'
            )}
          >
            <Send size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
