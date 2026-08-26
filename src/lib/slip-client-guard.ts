import jsQR from 'jsqr'

/**
 * Scans an image file on the client-side to verify if it contains a readable QR code.
 * This saves SlipOK API credits by rejecting non-slip images or empty photos before server upload.
 */
export async function detectQrCodeInImage(file: File): Promise<{ hasQr: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Only check image files
    if (!file.type.startsWith('image/')) {
      return resolve({ hasQr: false, error: 'กรุณาอัปโหลดไฟล์รูปภาพสลิป (JPG, PNG)' })
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (!ctx) {
          // Fallback if canvas context is not supported
          return resolve({ hasQr: true })
        }

        // Limit canvas dimensions for fast scan
        const maxDim = 1200
        let w = img.width
        let h = img.height

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }

        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data && code.data.length > 5) {
          resolve({ hasQr: true })
        } else {
          // Some slips have dark or inverted QR codes, attempt with inversion
          const codeInverted = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'onlyInvert',
          })

          if (codeInverted && codeInverted.data && codeInverted.data.length > 5) {
            resolve({ hasQr: true })
          } else {
            resolve({
              hasQr: false,
              error: 'ไม่พบ QR Code ในรูปภาพสลิป กรุณาถ่ายหรือแคปรูปสลิปธนาคารที่มี QR Code ชัดเจน',
            })
          }
        }
      } catch {
        // In case of parsing exception on canvas, let server SlipOK check as fallback
        resolve({ hasQr: true })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ hasQr: false, error: 'ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง' })
    }

    img.src = url
  })
}
