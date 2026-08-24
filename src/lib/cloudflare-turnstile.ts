/**
 * Verifies a Cloudflare Turnstile CAPTCHA response token
 * Cloudflare Turnstile provides smart, privacy-first bot protection.
 */
export async function verifyCloudflareTurnstile(token: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  // If secret key is not set, allow requests (in development or optional mode)
  if (!secretKey) {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'Missing Cloudflare Turnstile security token' }
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteIp) formData.append('remoteip', remoteIp)

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    const result = await fetch(url, {
      body: formData,
      method: 'POST',
    })

    const outcome = await result.json()
    if (outcome.success) {
      return { success: true }
    } else {
      return {
        success: false,
        error: outcome['error-codes']?.join(', ') || 'Security verification failed',
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Cloudflare Turnstile verification error: ${msg}` }
  }
}
