import { NextRequest, NextResponse } from 'next/server'
import { getObjectFromCloudflareR2 } from '@/lib/cloudflare-r2'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 })
  }

  try {
    const data = await getObjectFromCloudflareR2(key)
    if (!data || !data.Body) {
      return new NextResponse('Slip image not found', { status: 404 })
    }

    const contentType = data.ContentType || 'image/jpeg'
    const byteArray = await data.Body.transformToByteArray()
    const buffer = Buffer.from(byteArray)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching slip from R2:', error)
    return new NextResponse('Error loading slip image', { status: 500 })
  }
}
