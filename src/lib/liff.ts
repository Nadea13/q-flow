import liff from '@line/liff'

export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

let isInitialized = false

/**
 * Initializes LINE LIFF SDK in client environment.
 */
export async function initLiff(): Promise<{ success: boolean; profile?: LiffProfile; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' }
  }

  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID

  if (!liffId) {
    return { success: false, error: 'NEXT_PUBLIC_LINE_LIFF_ID not configured' }
  }

  try {
    if (!isInitialized) {
      await liff.init({ liffId })
      isInitialized = true
    }

    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile()
      return {
        success: true,
        profile: {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        },
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}
