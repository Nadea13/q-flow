/**
 * Server-side verification for Cloudflare Turnstile CAPTCHA Token
 */
export async function verifyTurnstileToken(token?: string | null, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  // If secret key is not set in env, skip only in local dev without keys
  if (!secretKey) {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'กรุณายืนยันความปลอดภัยผ่าน Cloudflare Turnstile ก่อนดำเนินการ' }
  }

  // Cloudflare standard test secret keys (always passes)
  if (secretKey === '1x0000000000000000000000000000000AA') {
    return { success: true }
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
        error: 'การตรวจสอบความปลอดภัย Cloudflare Turnstile ไม่ผ่าน กรุณาลองใหม่อีกครั้ง',
      }
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Cloudflare Turnstile' }
  }
}
