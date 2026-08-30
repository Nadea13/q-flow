'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OnboardingRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    const target = query ? `/create-shop?${query}` : '/create-shop'
    router.replace(target)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingRedirect />
    </Suspense>
  )
}

