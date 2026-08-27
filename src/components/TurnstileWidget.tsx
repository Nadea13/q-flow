'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  className?: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'flexible' | 'compact'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme: themeProp,
  className = '',
}: TurnstileWidgetProps) {
  const { theme: appTheme } = useTheme()
  const currentTheme = themeProp || appTheme || 'auto'

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAA'

  useEffect(() => {
    // If turnstile script not yet injected, inject it once
    const scriptId = 'cloudflare-turnstile-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    function renderWidget() {
      if (window.turnstile && containerRef.current) {
        try {
          // If already rendered, remove old widget first (e.g. on theme change)
          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current)
            widgetIdRef.current = null
          }

          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token)
            },
            'error-callback': () => {
              onError?.()
            },
            'expired-callback': () => {
              onExpire?.()
            },
            theme: currentTheme,
            size: 'flexible',
          })
          widgetIdRef.current = id
        } catch (err) {
          console.error('Turnstile render error:', err)
        }
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => {
        renderWidget()
      }
      document.head.appendChild(script)
    } else {
      if (window.turnstile) {
        renderWidget()
      } else {
        script.addEventListener('load', renderWidget)
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [siteKey, onVerify, onError, onExpire, currentTheme])

  if (!siteKey || siteKey === '0x4AAAAAA') {
    return null
  }

  return (
    <div className={`w-full my-2.5 overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full min-h-[65px]" />
    </div>
  )
}
