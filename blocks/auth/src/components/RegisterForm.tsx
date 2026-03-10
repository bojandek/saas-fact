import { useAuth } from '../hooks/useAuth'
import { Button } from '@saas-factory/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@saas-factory/ui'
import { Input } from '@saas-factory/ui'
import { Label } from '@saas-factory/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { signUp } = useAuth()
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUp(data.email, data.password)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
            </div>
            <Button type="submit" className="w-full">
              Register
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
