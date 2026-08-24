import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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

    // Generate public CDN URL
    const fileUrl = publicUrl 
      ? `${publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`

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
