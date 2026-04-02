import { useState } from 'react'
import { useLocation, useNavigate, useMatch } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, LogOut, Flame, DollarSign, Menu, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import UserAvatar from '@/components/UserAvatar'
import { cn } from '@/lib/utils'

interface TopNavProps {
  onNewIssue: () => void
}

const navItems = [
  { to: '/', label: 'Hot Sheet', icon: Flame, end: true },
  { to: '/costs', label: 'Costs', icon: DollarSign, end: false },
]

function DesktopNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Flame
  end: boolean
}) {
  const navigate = useNavigate()
  const match = useMatch({ path: to, end })
  const isActive = !!match

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-[20px] transition-all duration-200',
        isActive
          ? 'text-white'
          : 'text-text-secondary hover:text-text-primary'
      )}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
      {isActive && (
        <>
          {/* Neon outline pill */}
          <motion.span
            layoutId="nav-pill"
            className="absolute inset-0 rounded-[20px] -z-[1]"
            style={{
              background: 'rgba(123, 124, 248, 0.06)',
              border: '1.5px solid rgba(123, 124, 248, 0.7)',
              boxShadow: '0 0 8px rgba(123, 124, 248, 0.3), 0 0 20px rgba(123, 124, 248, 0.15), inset 0 0 8px rgba(123, 124, 248, 0.08)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          {/* Bright glow beam above — wider and more visible */}
          <motion.span
            layoutId="nav-glow"
            className="absolute -top-[17px] left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full -z-[1]"
            style={{
              background: 'linear-gradient(90deg, transparent, #7B7CF8, transparent)',
              boxShadow: '0 0 8px 2px rgba(123, 124, 248, 0.8), 0 4px 20px 6px rgba(123, 124, 248, 0.5), 0 8px 40px 12px rgba(123, 124, 248, 0.25)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          {/* Wide cone of light — more visible */}
          <motion.span
            layoutId="nav-cone"
            className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-24 h-14 -z-[2] pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(123, 124, 248, 0.25), rgba(123, 124, 248, 0.05) 60%, transparent)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </>
      )}
    </button>
  )
}

export default function TopNav({ onNewIssue }: TopNavProps) {
  const { profile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 overflow-visible">
      {/* Glass background with layered depth */}
      <div
        className="absolute inset-0 bg-card-bg/70 backdrop-blur-xl"
        style={{
          borderBottom: '1px solid rgba(123, 124, 248, 0.08)',
        }}
      />
      {/* Gradient shimmer along bottom edge — visible */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, rgba(123, 124, 248, 0.4) 25%, rgba(123, 124, 248, 0.6) 50%, rgba(123, 124, 248, 0.4) 75%, transparent 95%)',
        }}
      />
      {/* Soft glow below the border line */}
      <div
        className="absolute -bottom-[1px] left-0 right-0 h-[6px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(123, 124, 248, 0.12) 30%, rgba(123, 124, 248, 0.2) 50%, rgba(123, 124, 248, 0.12) 70%, transparent 90%)',
          filter: 'blur(3px)',
        }}
      />

      <div className="relative max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: hamburger + logo + nav */}
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          <h1
            className="text-[22px] font-bold tracking-tight select-none"
            style={{
              color: '#7B7CF8',
              textShadow: '0 0 12px rgba(123, 124, 248, 0.5), 0 0 30px rgba(123, 124, 248, 0.3), 0 0 60px rgba(123, 124, 248, 0.1)',
            }}
          >
            HavenHQ
          </h1>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label, icon, end }) => (
              <DesktopNavItem key={to} to={to} label={label} icon={icon} end={end} />
            ))}
          </nav>
        </div>

        {/* Right: new issue + user */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* CTA button — neon outline with glow */}
          <div className="relative group">
            <div
              className="absolute -inset-2 rounded-[24px] opacity-50 group-hover:opacity-80 transition-opacity duration-300 blur-xl pointer-events-none"
              style={{ background: 'rgba(123, 124, 248, 0.5)' }}
            />
            <button
              onClick={onNewIssue}
              className="relative flex items-center gap-1.5 px-5 py-2 rounded-[20px] font-medium text-sm text-white min-h-[40px] transition-all duration-200 hover:scale-[1.03]"
              style={{
                background: 'rgba(123, 124, 248, 0.12)',
                border: '1.5px solid rgba(123, 124, 248, 0.8)',
                boxShadow: '0 0 10px rgba(123, 124, 248, 0.4), 0 0 30px rgba(123, 124, 248, 0.15), inset 0 0 10px rgba(123, 124, 248, 0.1)',
              }}
            >
              <Plus size={18} strokeWidth={1.5} />
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {profile && (
              <div className="hidden sm:block">
                <UserAvatar initials={profile.initials} name={profile.name} />
              </div>
            )}
            {profile && (
              <div className="sm:hidden">
                <UserAvatar initials={profile.initials} />
              </div>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="hidden sm:flex items-center justify-center min-w-[36px] min-h-[36px] rounded-[8px] transition-all duration-200 hover:scale-[1.05]"
              style={{
                color: '#7B7CF8',
                filter: 'drop-shadow(0 0 4px rgba(123, 124, 248, 0.5)) drop-shadow(0 0 10px rgba(123, 124, 248, 0.25))',
              }}
              title="Settings"
            >
              <Settings size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={signOut}
              className="hidden sm:flex items-center justify-center min-w-[36px] min-h-[36px] rounded-[8px] text-text-muted hover:text-text-primary hover:bg-white/5 transition-all duration-200"
              title="Sign out"
            >
              <LogOut size={17} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-card-bg border-border" showCloseButton={false}>
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
            <SheetTitle
              className="text-[22px] font-bold tracking-tight text-left"
              style={{
                color: '#7B7CF8',
                textShadow: '0 0 20px rgba(123, 124, 248, 0.3)',
              }}
            >
              HavenHQ
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col py-2">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive =
                to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <button
                  key={to}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(to)
                  }}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3.5 text-base font-medium min-h-[48px] transition-colors text-left',
                    isActive
                      ? 'bg-haven-indigo/10 text-haven-indigo'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  {label}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-border">
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/settings') }}
              className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover w-full min-h-[48px] transition-colors"
            >
              <Settings size={20} strokeWidth={1.5} />
              Settings
            </button>
          </div>

          <div className="border-t border-border">
            {profile && (
              <div className="px-5 py-3.5 flex items-center gap-3">
                <UserAvatar initials={profile.initials} name={profile.name} />
              </div>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                signOut()
              }}
              className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover w-full min-h-[48px] transition-colors"
            >
              <LogOut size={20} strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
