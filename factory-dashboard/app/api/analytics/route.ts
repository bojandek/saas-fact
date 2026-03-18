import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Aggregate analytics from all projects
  const { data: projects } = await supabase
    .from('projects')
    .select('mrr, users, status')

  if (!projects) {
    return Response.json({
      total_mrr: 0,
      total_users: 0,
      total_projects: 0,
      churn_rate: 0,
      avg_arr: 0,
    })
  }

  const total_mrr = projects.reduce((sum, p) => sum + (p.mrr || 0), 0)
  const total_users = projects.reduce((sum, p) => sum + (p.users || 0), 0)
  const total_projects = projects.length
  const live_projects = projects.filter(p => p.status === 'live').length

  return Response.json({
    total_mrr,
    total_users,
    total_projects,
    live_projects,
    churn_rate: 0.05, // TODO: calculate from historical data
    avg_arr: total_mrr * 12 / (live_projects || 1),
  })
}
