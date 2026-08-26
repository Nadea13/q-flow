'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function LiffStateResolver() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // LINE LIFF opens URL as: https://your-domain.com/?liff.state=%2Fcheckout%3Fplan%3Dprofessional
    const url = new URL(window.location.href)
    const liffState = url.searchParams.get('liff.state')

    if (liffState) {
      try {
        const decodedPath = decodeURIComponent(liffState)
        // Check if it's a valid relative path starting with '/'
        if (decodedPath.startsWith('/')) {
          router.replace(decodedPath)
        }
      } catch {
        // Fallback
      }
    }
  }, [router])

  return null
}
