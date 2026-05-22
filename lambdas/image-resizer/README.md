# mini-jira-image-resizer

S3-triggered AWS Lambda that reads original task images, creates a 300px-wide thumbnail, and writes the resized image to the resized images bucket using the same key.

## Runtime

- Node.js 22.x
- AWS SDK v3
- sharp

## Environment Variables

```env
RESIZED_IMAGES_BUCKET=mini-jira-swprojectgiu-2026-resized
```

## Local Packaging

Sharp includes native binaries, so do not deploy a ZIP built from normal Windows `node_modules`. Build the package with Linux x64 dependencies for AWS Lambda.

Clean the local package:

```powershell
npm run clean
```

Install Lambda-compatible dependencies:

```powershell
npm install --os=linux --cpu=x64 --libc=glibc --include=optional
```

Older instructions sometimes use `npm install --platform=linux --arch=x64`; npm 11 on this machine warns that those flags are unknown, so this package uses `--os`, `--cpu`, and `--libc` to reliably install Linux x64 sharp binaries.

Create a deployment ZIP:

```powershell
npm run zip
```

Or run the full packaging flow:

```powershell
npm run package:lambda
```

The ZIP output is:

```text
image-resizer.zip
```

## AWS Console Deployment Summary

1. Open AWS Lambda in the AWS Console.
2. Create a function named `mini-jira-image-resizer`.
3. Choose runtime `Node.js 22.x`.
4. Use an execution role with least-privilege access to:
   - read objects from the originals bucket
   - write objects to the resized bucket
   - write CloudWatch Logs
5. Upload `image-resizer.zip` as the function code.
6. Set handler to:

```text
index.handler
```

7. Add environment variable:

```text
RESIZED_IMAGES_BUCKET=mini-jira-swprojectgiu-2026-resized
```

8. Add an S3 trigger on the originals bucket for `ObjectCreated` events.
9. Keep both buckets private. Do not add public-read ACLs or disable block public access.

## Behavior

- Input bucket comes from the S3 event record.
- Output bucket comes from `RESIZED_IMAGES_BUCKET`.
- The resized object uses the same key as the original object.
- Supported file extensions:
  - `.jpg`
  - `.jpeg`
  - `.jfif`
  - `.png`
  - `.webp`
- Unsupported extensions are skipped and logged.
