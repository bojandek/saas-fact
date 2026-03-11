'use client'

import { LoginForm } from '@saas-factory/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="mt-2 text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-blue-600 hover:underline"
            >
              Register
            </button>
          </p>
        </div>
        <LoginForm 
          onSuccess={() => {
            router.push('/dashboard')
          }}
        />
      </div>
    </div>
  )
}