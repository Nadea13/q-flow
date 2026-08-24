import QRCode from 'qrcode'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatePayload = require('promptpay-qr')

export interface PromptPayQRResult {
  qrDataUrl: string
  payload: string
  amount: number
  promptpayId: string
}

/**
 * Generates an EMVCo PromptPay QR Code as a Data URL
 * @param promptpayId Mobile number (e.g. "0812345678") or National ID / Tax ID (13 digits)
 * @param amount Deposit amount in THB
 */
export async function generatePromptPayQR(
  promptpayId: string,
  amount: number
): Promise<PromptPayQRResult> {
  const cleanId = promptpayId.replace(/[^0-9]/g, '')
  const payload = generatePayload(cleanId, { amount: Number(amount) })
  
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  return {
    qrDataUrl,
    payload,
    amount,
    promptpayId,
  }
}
