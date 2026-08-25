/**
 * Server-side verification for Cloudflare Turnstile CAPTCHA Token
 */
export async function verifyTurnstileToken(token?: string | null, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  // If secret key is not configured, allow bypass gracefully in dev
  if (!secretKey || secretKey.startsWith('0x4AAAAAA') && process.env.NODE_ENV === 'development' && !token) {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: '?????????????????????? (Cloudflare Turnstile)' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteIp) {
      formData.append('remoteip', remoteIp)
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await res.json()
    if (data.success) {
      return { success: true }
    } else {
      return {
        success: false,
        error: '?????????????????????????????? ????????????????????'
      }
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return { success: false, error: '????????????????????????????????????????' }
  }
}
