const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({});
const THUMBNAIL_WIDTH = 300;
const SUPPORTED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION_TO_CONTENT_TYPE = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.jfif', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

exports.handler = async (event) => {
  const resizedBucket = process.env.RESIZED_IMAGES_BUCKET;

  if (!resizedBucket) {
    throw new Error('Missing required environment variable RESIZED_IMAGES_BUCKET');
  }

  const records = event?.Records ?? [];
  console.log(`Received ${records.length} S3 record(s)`);

  for (const record of records) {
    await resizeRecord(record, resizedBucket);
  }

  return {
    statusCode: 200,
    processedRecords: records.length,
  };
};

async function resizeRecord(record, resizedBucket) {
  const sourceBucket = record?.s3?.bucket?.name;
  const rawKey = record?.s3?.object?.key;

  if (!sourceBucket || !rawKey) {
    throw new Error(`Invalid S3 event record: ${JSON.stringify(record)}`);
  }

  const sourceKey = decodeS3Key(rawKey);
  const contentType = getContentTypeFromKey(sourceKey);

  if (!contentType) {
    console.log(`Skipping unsupported object extension: s3://${sourceBucket}/${sourceKey}`);
    return;
  }

  console.log(`Resizing s3://${sourceBucket}/${sourceKey} to s3://${resizedBucket}/${sourceKey}`);

  const sourceObject = await s3.send(
    new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    }),
  );

  const sourceBuffer = await streamToBuffer(sourceObject.Body);
  const resizedBuffer = await resizeImage(sourceBuffer, contentType);

  await s3.send(
    new PutObjectCommand({
      Bucket: resizedBucket,
      Key: sourceKey,
      Body: resizedBuffer,
      ContentType: contentType,
    }),
  );

  console.log(`Uploaded resized image: s3://${resizedBucket}/${sourceKey}`);
}

function decodeS3Key(rawKey) {
  return decodeURIComponent(rawKey.replace(/\+/g, ' '));
}

function getContentTypeFromKey(key) {
  const lowerKey = key.toLowerCase();

  for (const [extension, contentType] of EXTENSION_TO_CONTENT_TYPE.entries()) {
    if (lowerKey.endsWith(extension)) {
      return contentType;
    }
  }

  return undefined;
}

async function resizeImage(sourceBuffer, contentType) {
  if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }

  const pipeline = sharp(sourceBuffer).resize({
    width: THUMBNAIL_WIDTH,
    withoutEnlargement: true,
  });

  if (contentType === 'image/jpeg') {
    return pipeline.jpeg().toBuffer();
  }

  if (contentType === 'image/png') {
    return pipeline.png().toBuffer();
  }

  return pipeline.webp().toBuffer();
}

async function streamToBuffer(stream) {
  if (!stream) {
    throw new Error('S3 object body is empty');
  }

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
