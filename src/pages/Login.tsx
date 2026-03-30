import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Login() {
  const { session, loading, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page-bg">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = isSignUp
      ? await signUp(email, password, name)
      : await signIn(email, password)

    if (result.error) {
      setError(result.error.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-page-bg">
      <Card className="w-full max-w-[400px] mx-4 shadow-lg border-border">
        <CardHeader className="text-center pb-2">
          <h1
            className="text-[28px] font-bold tracking-tight"
            style={{ color: '#5B5BD6' }}
          >
            HavenHQ
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required={isSignUp}
                  className="rounded-[8px]"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="rounded-[8px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="rounded-[8px]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[8px] font-medium"
              style={{
                backgroundColor: submitting ? '#4A4AC4' : '#5B5BD6',
              }}
            >
              {submitting
                ? 'Please wait...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                }}
                className="font-medium hover:underline"
                style={{ color: '#5B5BD6' }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
