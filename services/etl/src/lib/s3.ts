import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

export function createS3Client(): S3Client {
  const endpoint = process.env['S3_ENDPOINT'];
  return new S3Client({
    ...(endpoint !== undefined && { endpoint }),
    region: process.env['S3_REGION'] ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env['S3_ACCESS_KEY'] ?? '',
      secretAccessKey: process.env['S3_SECRET_KEY'] ?? '',
    },
    forcePathStyle: true,
  });
}

export async function getObjectStream(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Readable> {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`S3 object ${key} returned no body`);
  return response.Body as Readable;
}
