import { S3Client } from '@aws-sdk/client-s3';
export { getR2ObjectPrefix } from '@/src/security/object-key';

export type R2PrivateConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
};

function normalizeBaseUrl(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/g, '');
}

export function getR2PrivateConfig(): R2PrivateConfig | null {
  const accountId = String(process.env.R2_ACCOUNT_ID ?? '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID ?? '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY ?? '').trim();
  const bucket = String(process.env.R2_PRIVATE_BUCKET ?? '').trim();
  const endpoint =
    normalizeBaseUrl(String(process.env.R2_ENDPOINT ?? '')) ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) return null;
  if (!/^[a-f0-9]{32}$/i.test(accountId)) return null;
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) return null;
  try {
    const endpointUrl = new URL(endpoint);
    const endpointHost = endpointUrl.hostname.toLowerCase();
    if (
      endpointUrl.protocol !== 'https:' ||
      endpointUrl.username ||
      endpointUrl.password ||
      endpointUrl.pathname !== '/' ||
      endpointUrl.search ||
      endpointUrl.hash ||
      !endpointHost.startsWith(`${accountId.toLowerCase()}.`) ||
      !endpointHost.endsWith('.r2.cloudflarestorage.com')
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

export function createR2Client(cfg: R2PrivateConfig): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
    // Avoid adding checksum query params/headers unless required; keeps presigned PUT simpler for browsers/R2.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}
