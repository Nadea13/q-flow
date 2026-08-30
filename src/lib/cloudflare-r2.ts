import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'qflow-slips'
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL // e.g. https://pub-xxx.r2.dev or https://cdn.qflow.app

let r2Client: S3Client | null = null

if (accountId && accessKeyId && secretAccessKey) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export interface R2UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

/**
 * Uploads a file buffer directly to Cloudflare R2 Storage.
 * If R2 credentials are not configured, returns success: false so the app can fallback to Supabase Storage.
 */
export async function uploadToCloudflareR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<R2UploadResult> {
  if (!r2Client) {
    return {
      success: false,
      error: 'Cloudflare R2 is not configured in environment variables.',
    }
  }

  const key = `slips/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })

    await r2Client.send(command)

    // Serve via internal proxy endpoint /api/slips/view?key=... if no public CDN domain is set
    const fileUrl = publicUrl && !publicUrl.includes('.r2.cloudflarestorage.com')
      ? `${publicUrl.replace(/\/$/, '')}/${key}`
      : `/api/slips/view?key=${encodeURIComponent(key)}`

    return {
      success: true,
      url: fileUrl,
      key,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('Failed to upload to Cloudflare R2:', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Retrieves an object stream from Cloudflare R2 bucket
 */
export async function getObjectFromCloudflareR2(key: string) {
  if (!r2Client) return null
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
    return await r2Client.send(command)
  } catch (err) {
    console.error('Failed to get object from Cloudflare R2:', err)
    return null
  }
}
