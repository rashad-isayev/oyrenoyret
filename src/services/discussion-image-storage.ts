import type { PutObjectCommandInput } from '@aws-sdk/client-s3';

type DiscussionImagePutInput = {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  userId: string;
};

export function buildDiscussionImagePutObjectInput({
  bucket,
  key,
  contentType,
  size,
  userId,
}: DiscussionImagePutInput): PutObjectCommandInput {
  return {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: 'private, max-age=31536000, immutable',
    Metadata: {
      'expected-size': String(size),
      'uploaded-by': userId,
    },
  };
}
