'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from './useAuth'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ['passwordConfirm'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function RegisterForm({ onSuccess, onError }: RegisterFormProps) {
  const { signUp, loading, error } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true)
      await signUp(data.email, data.password, data.name)
      onSuccess?.()
    } catch (err: any) {
      onError?.(err.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          {...register('name')}
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="John Doe"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          {...register('email')}
          type="email"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          {...register('password')}
          type="password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          {...register('passwordConfirm')}
          type="password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
        {errors.passwordConfirm && <p className="text-red-500 text-sm">{errors.passwordConfirm.message}</p>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error.message}</div>}

      <button
        type="submit"
        disabled={loading || isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
      >
        {loading || isSubmitting ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  )
}
