// lib/s3.js
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isLocal = !!process.env.S3_ENDPOINT;

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  ...(isLocal
    ? {
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true, // required for MinIO — it doesn't support virtual-hosted-style URLs
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}), // production: no explicit credentials — EC2 instance role is used automatically
});

const BUCKET = process.env.S3_BUCKET_NAME;

export async function uploadAttachment(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}

export async function deleteAttachment(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Delete every object under a key prefix (e.g. "health-entries/<id>/").
 * Used when a health entry is removed so no orphaned files — or the "folder"
 * itself — are left behind in the bucket.
 */
export async function deleteAttachmentsByPrefix(prefix) {
  let ContinuationToken;
  do {
    const listed = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken,
    }));

    const objects = (listed.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (objects.length > 0) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: objects },
      }));
    }

    ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

export async function getAttachmentUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}