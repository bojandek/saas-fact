'use client'

import { RegisterForm } from '@saas-factory/auth'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Register</h1>
          <p className="mt-2 text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:underline"
            >
              Login
            </button>
          </p>
        </div>
        <RegisterForm 
          onSuccess={() => {
            router.push('/dashboard')
          }}
        />
      </div>
    </div>
  )
}