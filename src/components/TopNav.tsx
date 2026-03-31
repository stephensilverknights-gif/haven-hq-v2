import { useState } from 'react'
import { useLocation, useNavigate, useMatch } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, LogOut, Flame, DollarSign, Menu, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
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
        'relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors',
        isActive
          ? 'text-haven-indigo'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
      )}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
      {isActive && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute inset-0 rounded-[8px] bg-haven-indigo/10 -z-[1]"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
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
    <header className="sticky top-0 z-30 bg-card-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
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
            className="text-[22px] font-bold tracking-tight"
            style={{ color: '#7B7CF8' }}
          >
            HavenHQ
          </h1>

          <nav className="hidden sm:flex items-center gap-0.5">
            {navItems.map(({ to, label, icon, end }) => (
              <DesktopNavItem key={to} to={to} label={label} icon={icon} end={end} />
            ))}
          </nav>
        </div>

        {/* Right: new issue + user */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            onClick={onNewIssue}
            className="rounded-[8px] font-medium gap-1.5 min-h-[44px]"
            style={{ backgroundColor: '#7B7CF8' }}
          >
            <Plus size={18} strokeWidth={1.5} />
            <span className="hidden sm:inline">New Task</span>
          </Button>

          <div className="flex items-center gap-3">
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
              className="hidden sm:flex items-center justify-center min-w-[44px] min-h-[44px] text-text-muted hover:text-text-secondary transition-colors"
              title="Settings"
            >
              <Settings size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={signOut}
              className="hidden sm:flex items-center justify-center min-w-[44px] min-h-[44px] text-text-muted hover:text-text-secondary transition-colors"
              title="Sign out"
            >
              <LogOut size={18} strokeWidth={1.5} />
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
              style={{ color: '#7B7CF8' }}
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
