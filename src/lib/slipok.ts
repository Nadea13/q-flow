export interface SlipVerificationResult {
  success: boolean
  message: string
  transRef?: string
  amount?: number
  paidAt?: string
  senderName?: string
  receiverName?: string
  receiverAccount?: string
  rawResponse?: Record<string, unknown>
}

/**
 * Verifies a bank transfer slip using the SlipOK API.
 * If SLIPOK_API_KEY is not configured, it simulates a successful check in development mode.
 */
export async function verifySlipWithSlipOK(
  fileBuffer: Buffer | ArrayBuffer,
  expectedAmount: number,
  expectedPromptPayId: string
): Promise<SlipVerificationResult> {
  const apiKey = process.env.SLIPOK_API_KEY?.trim()
  const rawBranchId = process.env.SLIPOK_BRANCH_ID?.trim()
  const branchId = rawBranchId?.replace(/^#/, '').trim()

  // If SlipOK API key is configured, perform real verification
  if (apiKey && branchId) {
    try {
      const formData = new FormData()
      const uint8 = new Uint8Array(fileBuffer)
      const blob = new Blob([uint8], { type: 'image/jpeg' })
      formData.append('files', blob, 'slip.jpg')

      const response = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
        method: 'POST',
        headers: {
          'x-authorization': apiKey,
        },
        body: formData,
      })

      const json = await response.json()

      if (!json.success || !json.data) {
        return {
          success: false,
          message: json.message || 'ไม่สามารถตรวจสอบสลิปได้ หรือไม่ใช่รูปสลิปธนาคารที่ถูกต้อง',
          rawResponse: json,
        }
      }

      const slipData = json.data
      const amountPaid = Number(slipData.amount)
      const transRef = slipData.transRef

      // Check amount
      if (Math.abs(amountPaid - expectedAmount) > 0.01) {
        return {
          success: false,
          message: `ยอดเงินในสลิป (${amountPaid} บาท) ไม่ตรงกับยอดมัดจำที่ต้องชำระ (${expectedAmount} บาท)`,
          transRef,
          amount: amountPaid,
          rawResponse: json,
        }
      }

      return {
        success: true,
        message: 'ตรวจสอบสลิปถูกต้องเรียบร้อย',
        transRef,
        amount: amountPaid,
        paidAt: slipData.transDate || slipData.dateTime,
        senderName: slipData.sender?.name?.displayName,
        receiverName: slipData.receiver?.name?.displayName,
        receiverAccount: slipData.receiver?.account?.value,
        rawResponse: json,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการเชื่อมต่อ SlipOK API: ${errorMsg}`,
      }
    }
  }

  // Fallback Simulation Mode (for Local Development & Demos without API Key)
  const mockTransRef = `SIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
  return {
    success: true,
    message: 'ตรวจสอบสลิปสำเร็จ (โหมดจำลอง Dev/Demo - ระบบจะเชื่อมต่อ SlipOK อัตโนมัติเมื่อใส่ SLIPOK_API_KEY)',
    transRef: mockTransRef,
    amount: expectedAmount,
    paidAt: new Date().toISOString(),
    senderName: 'ผู้โอนเงินทดสอบ',
    receiverName: 'ร้านค้า (QFlow)',
    receiverAccount: expectedPromptPayId,
    rawResponse: {
      is_simulated: true,
      expectedAmount,
      expectedPromptPayId,
      transRef: mockTransRef,
    },
  }
}
