# Cloudinary Component for Convex

[![npm version](https://badge.fury.io/js/cloudinary-component.svg)](https://badge.fury.io/js/cloudinary-component)

A comprehensive Cloudinary integration component for Convex that provides image upload, transformation, and management capabilities using direct Cloudinary REST APIs with full TypeScript support.

<!-- START: Include on https://convex.dev/components -->

## Features

- **Two Upload Methods**: Base64 upload for small files, direct upload for large files (bypasses 16MB limit)
- **Large File Support**: Direct browser-to-Cloudinary uploads with signed URLs for files up to 100MB+
- **Progress Tracking**: Real-time upload progress for direct uploads
- **Dynamic Transformations**: Generate transformed URLs on-the-fly
- **Asset Management**: Track and manage all uploaded assets in your Convex database
- **Type Safety**: Full TypeScript support with exported validators and inferred types
- **Secure**: Server-side signature generation, environment-based credentials
- **Database Integration**: Automatic asset tracking with optimized indexes
- **Reusable Validators**: Export validators like `vAssetResponse` for consistent typing

**Why use this component?**

- **Direct API Integration**: Uses Cloudinary REST APIs directly instead of SDKs for better control and reduced dependencies
- **Bypasses Convex Limits**: Direct upload flow avoids the 16MB argument size limit for large files
- **Seamless Integration**: Native Convex integration with real-time database updates
- **Production Ready**: Built-in error handling, validation, and secure signature generation
- **Developer Experience**: Rich TypeScript types with `Infer<>` derived types

Found a bug? Feature request? [File it here](https://github.com/imaxisXD/cloudinary-convex/issues).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Your Convex App                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌──────────────────────────────────────────────┐  │
│  │  Your Actions/  │     │         Cloudinary Component                  │  │
│  │    Queries      │────▶│  ┌────────────────────────────────────────┐  │  │
│  └─────────────────┘     │  │              lib.ts                     │  │  │
│          │               │  │  • upload (base64, <10MB)               │  │  │
│          │               │  │  • generateUploadCredentials            │  │  │
│          ▼               │  │  • finalizeUpload                       │  │  │
│  ┌─────────────────┐     │  │  • transform, delete, list, get         │  │  │
│  │ CloudinaryClient│     │  └────────────────────────────────────────┘  │  │
│  │   (optional)    │     │                     │                        │  │
│  └─────────────────┘     │                     ▼                        │  │
│                          │  ┌────────────────────────────────────────┐  │  │
│                          │  │           assets table                  │  │  │
│                          │  │  Indexes: by_publicId, by_userId,      │  │  │
│                          │  │           by_folder, by_uploadedAt     │  │  │
│                          │  └────────────────────────────────────────┘  │  │
│                          └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────┐
                         │     Cloudinary API       │
                         │  • Upload API            │
                         │  • Admin API             │
                         │  • Transformation URLs   │
                         └──────────────────────────┘
```

### Upload Flow Options

**Option A: Base64 Upload (Small Files < 10MB)**

```
Browser → Convex Action → Cloudinary API → Store metadata in DB
```

**Option B: Direct Upload (Large Files > 10MB)**

```
1. Browser → Convex Action → Generate signed credentials
2. Browser → Cloudinary API (direct upload with progress)
3. Browser → Convex Mutation → Store metadata in DB
```

## Prerequisites

1. **Convex Project**: An existing Convex project ([Setup Guide](https://docs.convex.dev/get-started))
2. **Cloudinary Account**: Free account at [cloudinary.com](https://cloudinary.com)

## Installation

```bash
npm install cloudinary-component
```

## Setup

### 1. Configure Convex

Create or update your `convex.config.ts` file:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import cloudinary from "cloudinary-component/convex.config";

const app = defineApp();
app.use(cloudinary);

export default app;
```

### 2. Set Environment Variables

Get your Cloudinary credentials from the [Cloudinary Console](https://cloudinary.com/console):

```bash
npx convex env set CLOUDINARY_CLOUD_NAME your_cloud_name_here
npx convex env set CLOUDINARY_API_KEY your_api_key_here
npx convex env set CLOUDINARY_API_SECRET your_api_secret_here
```

## Quick Start

### Using CloudinaryClient (Recommended)

```ts
// convex/images.ts
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { CloudinaryClient } from "cloudinary-component";
// Import the shared validator for consistent return types
import { vAssetResponse } from "cloudinary-component/lib";
import { v } from "convex/values";

// Validate environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary environment variables not set");
}

// Configure Cloudinary client
const cloudinary = new CloudinaryClient(components.cloudinary, {
  cloudName,
  apiKey,
  apiSecret,
});

// Upload an image (base64 - for files under ~10MB)
export const uploadImage = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await cloudinary.upload(ctx, args.base64Data, {
      filename: args.filename,
      folder: args.folder || "uploads",
      tags: ["user-content"],
    });
  },
});

// List images using the shared validator
export const getImages = query({
  args: {},
  // Use the exported validator instead of inline definition
  returns: v.array(vAssetResponse),
  handler: async (ctx) => {
    return await cloudinary.list(ctx, {
      limit: 20,
      order: "desc",
    });
  },
});
```

### Direct Component Usage

You can also use component functions directly without the client wrapper:

```ts
// convex/images.ts
import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

export const uploadImage = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      apiSecret: process.env.CLOUDINARY_API_SECRET!,
    };

    return await ctx.runAction(components.cloudinary.lib.upload, {
      base64Data: args.base64Data,
      filename: args.filename,
      folder: "uploads",
      config,
    });
  },
});
```

## Handling Large Files (Direct Upload)

Convex has a 16MB argument size limit. Since base64 encoding adds ~33% overhead, the practical limit for `upload()` is ~10-12MB. For larger files, use the direct upload flow.

### Direct Upload Flow

The direct upload bypasses Convex for the file transfer, uploading directly from the browser to Cloudinary:

```ts
// convex/images.ts - Backend
export const getUploadCredentials = action({
  args: {
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await cloudinary.generateUploadCredentials(ctx, {
      filename: args.filename,
      folder: args.folder || "large-uploads",
    });
  },
});

export const finalizeUpload = action({
  args: {
    publicId: v.string(),
    uploadResult: v.object({
      public_id: v.string(),
      secure_url: v.string(),
      url: v.string(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      format: v.string(),
      bytes: v.optional(v.number()),
      created_at: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      folder: v.optional(v.string()),
      original_filename: v.optional(v.string()),
    }),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.cloudinary.lib.finalizeUpload, {
      publicId: args.publicId,
      uploadResult: args.uploadResult,
      userId: args.userId,
    });
  },
});
```

### Client-Side Direct Upload

```tsx
// React component example
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function LargeFileUploader() {
  const getCredentials = useAction(api.images.getUploadCredentials);
  const finalize = useAction(api.images.finalizeUpload);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    // Step 1: Get signed credentials
    const credentials = await getCredentials({ filename: file.name });

    // Step 2: Upload directly to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    Object.entries(credentials.uploadParams).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    const uploadResult = await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = reject;
      xhr.open("POST", credentials.uploadUrl);
      xhr.send(formData);
    });

    // Step 3: Store metadata in Convex
    await finalize({
      publicId: uploadResult.public_id,
      uploadResult,
    });
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {progress > 0 && <progress value={progress} max="100" />}
    </div>
  );
}
```

### Using CloudinaryClient.uploadDirect (Simplified)

The `CloudinaryClient` provides a convenient `uploadDirect` method that handles all three steps:

```ts
// In a React component with Convex action context
const result = await cloudinary.uploadDirect(ctx, file, {
  folder: "uploads",
  onProgress: (progress) => setUploadProgress(progress),
  validation: { maxSize: 50 * 1024 * 1024 }, // 50MB max
});
```

### Choosing the Right Upload Method

| File Size              | Recommended Method  | Why                         |
| ---------------------- | ------------------- | --------------------------- |
| < 10MB                 | `upload()` (base64) | Simple, works everywhere    |
| > 10MB                 | `uploadDirect()`    | Bypasses Convex 16MB limit  |
| Any size with progress | `uploadDirect()`    | Real-time progress tracking |

```ts
// Helper to choose upload method
if (CloudinaryClient.isLargeFile(file)) {
  // Use direct upload
  await cloudinary.uploadDirect(ctx, file, options);
} else {
  // Use base64 upload
  const base64 = await CloudinaryClient.fileToBase64(file);
  await cloudinary.upload(ctx, base64, options);
}
```

## Exported Validators and Types

The component exports validators following Convex conventions for consistent type definitions:

```ts
import {
  vTransformation, // Validator for transformation options
  vAsset, // Validator for internal asset (with Id<"assets">)
  vAssetResponse, // Validator for external responses (with string _id)
  vCloudinaryUploadResponse, // Validator for raw Cloudinary API responses
  type Transformation, // TypeScript type derived from vTransformation
  type Asset, // TypeScript type derived from vAsset
  type AssetResponse, // TypeScript type derived from vAssetResponse
  type CloudinaryUploadResult, // TypeScript type for Cloudinary responses
} from "cloudinary-component/lib";
```

### Using Validators in Your Functions

```ts
import {
  vAssetResponse,
  vTransformation,
  vCloudinaryUploadResponse,
} from "cloudinary-component/lib";

// Use in return validators - no more large inline objects!
export const listImages = query({
  args: {},
  returns: v.array(vAssetResponse),
  handler: async (ctx) => {
    return await cloudinary.list(ctx);
  },
});

// Use transformation validator
export const transformImage = query({
  args: {
    publicId: v.string(),
    transformation: vTransformation,
  },
  handler: async (ctx, args) => {
    return await cloudinary.transform(ctx, args.publicId, args.transformation);
  },
});

// Use Cloudinary upload response validator for direct uploads
export const finalizeUpload = action({
  args: {
    publicId: v.string(),
    uploadResult: vCloudinaryUploadResponse, // Validates all Cloudinary response fields
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ...
  },
});
```

### Why Multiple Asset Validators?

- **`vAsset`**: Uses `v.id("assets")` - for use within the component where the table exists
- **`vAssetResponse`**: Uses `v.string()` for `_id` - for use in your app, since IDs are serialized as strings when crossing component boundaries
- **`vCloudinaryUploadResponse`**: Validates the raw response from Cloudinary's upload API, including all fields like `access_mode`, `asset_id`, `etag`, etc.

## API Reference

### CloudinaryClient Methods

#### `upload(ctx, base64Data, options?)`

Upload a file using base64 data. Best for files under ~10MB.

```ts
const result = await cloudinary.upload(ctx, base64Data, {
  filename: "photo.jpg",
  folder: "uploads",
  tags: ["user-content"],
  transformation: { width: 500, height: 500, crop: "fill" },
  publicId: "custom-id",
  userId: "user123",
});
```

**Returns:**

```ts
{
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
}
```

#### `uploadDirect(ctx, file, options?)`

Upload directly to Cloudinary, bypassing Convex for the file transfer. Best for large files.

```ts
const result = await cloudinary.uploadDirect(ctx, file, {
  folder: "large-uploads",
  onProgress: (progress) => console.log(`${progress}%`),
  validation: { maxSize: 100 * 1024 * 1024 },
});
```

#### `generateUploadCredentials(ctx, options?)`

Generate signed credentials for manual direct upload implementation.

```ts
const credentials = await cloudinary.generateUploadCredentials(ctx, {
  folder: "uploads",
  tags: ["direct"],
});
// Returns: { uploadUrl, uploadParams: { api_key, timestamp, signature, ... } }
```

#### `transform(ctx, publicId, transformation)`

Generate a transformed URL for an existing image.

```ts
const { transformedUrl, secureUrl } = await cloudinary.transform(
  ctx,
  "sample-image",
  { width: 300, height: 300, crop: "fill", quality: "auto", format: "webp" }
);
```

#### `delete(ctx, publicId)`

Delete an image from Cloudinary and the database.

```ts
const result = await cloudinary.delete(ctx, "sample-image");
```

#### `list(ctx, options?)`

List stored assets with filtering and pagination.

```ts
const images = await cloudinary.list(ctx, {
  userId: "user123",
  folder: "uploads",
  tags: ["featured"],
  limit: 10,
  orderBy: "uploadedAt",
  order: "desc",
});
```

#### `getAsset(ctx, publicId)`

Get a single asset by public ID.

```ts
const asset = await cloudinary.getAsset(ctx, "sample-image");
```

#### `updateAsset(ctx, publicId, updates)`

Update asset metadata.

```ts
const updated = await cloudinary.updateAsset(ctx, "sample-image", {
  tags: ["featured", "homepage"],
  metadata: { category: "product" },
});
```

### Static Helper Methods

```ts
// Convert File to base64 (browser only)
const base64 = await CloudinaryClient.fileToBase64(file);

// Check if file should use direct upload
const isLarge = CloudinaryClient.isLargeFile(file, 10 * 1024 * 1024);

// Validate file before upload
await CloudinaryClient.validateFile(file, {
  maxSize: 50 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
});
```

## Transformation Options

```ts
interface CloudinaryTransformation {
  width?: number; // Resize width (1-4000)
  height?: number; // Resize height (1-4000)
  crop?: string; // "fill" | "fit" | "crop" | "scale" | "thumb" | "pad" | "limit"
  quality?: string; // "auto" | "best" | "good" | "eco" | "low"
  format?: string; // "webp" | "jpg" | "png" | "avif" | "gif" | etc.
  gravity?: string; // "auto" | "face" | "center" | "north" | "south" | etc.
  radius?: number | string; // Border radius (0-2000) or "max" for circle
  overlay?: string; // Overlay image public_id
  effect?: string; // "grayscale" | "blur" | "sepia" | etc.
}
```

## Database Schema

The component creates an `assets` table:

```ts
{
  _id: Id<"assets">,
  _creationTime: number,
  publicId: string,
  cloudinaryUrl: string,
  secureUrl: string,
  originalFilename?: string,
  format: string,
  width?: number,
  height?: number,
  bytes?: number,
  transformations?: any[],
  tags?: string[],
  folder?: string,
  metadata?: any,
  uploadedAt: number,
  updatedAt: number,
  userId?: string,
}
```

**Indexes:** `by_publicId`, `by_userId`, `by_folder`, `by_uploadedAt`

## File Validation

Built-in validation includes:

- **File Types**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG
- **File Size**: Configurable (default 10MB for base64, 100MB for direct)
- **Dimensions**: Width/height 1-4000 pixels
- **Security**: Safe filename and folder path validation

## ⚠️ Important: Cloudinary Plan Limits

Cloudinary enforces file size and API limits based on your subscription plan. Uploads exceeding these limits will fail.

| Limit                         | Free   | Plus  | Advanced | Enterprise |
| ----------------------------- | ------ | ----- | -------- | ---------- |
| **Max image file size**       | 10 MB  | 20 MB | 40 MB    | Custom     |
| **Max video file size**       | 100 MB | 2 GB  | 4 GB     | Custom     |
| **Max raw file size**         | 10 MB  | 20 MB | 40 MB    | Custom     |
| **Max image megapixels**      | 25 MP  | 25 MP | 50 MP    | Custom     |
| **Admin API hourly requests** | 500    | 2,000 | 2,000    | Custom     |

> **Note for Free Plan Users:** The free tier limits images to **10 MB** and videos to **100 MB**. Attempting to upload larger files will result in an error. Consider upgrading your plan if you need to handle larger files.

For the latest limits and pricing, see [Cloudinary Pricing](https://cloudinary.com/pricing/compare-plans).

## Best Practices

### Security

- Never expose Cloudinary credentials in client-side code
- Use environment variables for all API keys
- Validate file types and sizes before upload
- Use `userId` field for multi-tenant access control

### Performance

- Use `uploadDirect()` for files over 10MB
- Leverage `f_auto,q_auto` transformations for optimal delivery
- Use database indexes for efficient queries

### Organization

- Use folders: `folder: "users/avatars"`
- Tag assets: `tags: ["profile", "verified"]`
- Use meaningful public_ids for important assets

## Error Handling

```ts
const result = await cloudinary.upload(ctx, base64Data, options);

if (!result.success) {
  console.error("Upload failed:", result.error);
  throw new Error(result.error || "Upload failed");
}

console.log("Uploaded:", result.secureUrl);
```

## Troubleshooting

**"Credentials not found" error:**

- Verify environment variables are set: `npx convex env list`
- Check Cloudinary dashboard for correct credentials

**Upload fails for large files:**

- Files over ~10MB need `uploadDirect()` to bypass 16MB limit
- Check Cloudinary account limits (free tier: 10MB per file)

**Type errors with validators:**

- Use `vAssetResponse` (not `vAsset`) in your app's return validators
- Run `npx convex dev` to regenerate types

**Images not loading:**

- Verify the public_id exists in Cloudinary
- Check your cloud name is correct

## Example Project

```bash
git clone https://github.com/imaxisXD/cloudinary-convex
cd cloudinary-component
npm run setup
npm run dev
```

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md).

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.

<!-- END: Include on https://convex.dev/components -->
