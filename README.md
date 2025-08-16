# Cloudinary Component for Convex

[![npm version](https://badge.fury.io/js/cloudinary-component.svg)](https://badge.fury.io/js/cloudinary-component)

A comprehensive Cloudinary integration component for Convex that provides image upload, transformation, and management capabilities using direct Cloudinary REST APIs with full TypeScript support.

<!-- START: Include on https://convex.dev/components -->

## Features

✨ **Easy Image Upload**: Programmatic upload to Cloudinary with validation  
🎨 **Dynamic Transformations**: Generate transformed URLs for existing images  
🗃️ **Asset Management**: Track and manage all uploaded assets in your Convex database  
🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions  
🔒 **Secure**: Environment-based credential management  
📊 **Database Integration**: Automatic asset tracking with optimized indexes  
🚀 **Client Wrapper**: Optional CloudinaryClient for simplified usage

Why use this component?

- **Direct API Integration**: Uses Cloudinary REST APIs directly instead of SDKs for better control and reduced dependencies
- **Seamless Integration**: Native Convex integration with real-time database updates
- **Production Ready**: Built-in error handling, validation, and secure signature generation
- **Developer Experience**: Rich TypeScript types and intuitive API
- **Performance**: Optimized image delivery through Cloudinary's global CDN
- **Flexible Usage**: Use directly or with the convenient CloudinaryClient wrapper

Found a bug? Feature request? [File it here](https://github.com/imaxisXD/cloudinary-convex/issues).

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Prerequisites

1. **Convex Project**: An existing Convex project ([Setup Guide](https://docs.convex.dev/get-started))
2. **Cloudinary Account**: Free account at [cloudinary.com](https://cloudinary.com)

## Installation

Install the component package:

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

Get your Cloudinary credentials from the [Cloudinary Console](https://cloudinary.com/console) and set them in your Convex deployment:

```bash
npx convex env set CLOUDINARY_CLOUD_NAME your_cloud_name_here
npx convex env set CLOUDINARY_API_KEY your_api_key_here
npx convex env set CLOUDINARY_API_SECRET your_api_secret_here
```

## Quick Start

### Option 1: Using CloudinaryClient (Recommended)

The easiest way to use the component is with the CloudinaryClient wrapper, similar to how Resend works:

```ts
// convex/images.ts
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { CloudinaryClient } from "cloudinary-component";
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

export const uploadImage = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await cloudinary.upload(ctx, args.base64Data, {
      filename: args.filename,
      folder: args.folder || "uploads",
      tags: ["user-content"],
      transformation:
        args.width || args.height
          ? {
              width: args.width || 400,
              height: args.height || 400,
              crop: "fill",
              quality: "auto",
            }
          : undefined,
    });
  },
});

export const getImages = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      publicId: v.string(),
      cloudinaryUrl: v.string(),
      secureUrl: v.string(),
      originalFilename: v.optional(v.string()),
      format: v.string(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      bytes: v.optional(v.number()),
      transformations: v.optional(v.array(v.any())),
      tags: v.optional(v.array(v.string())),
      folder: v.optional(v.string()),
      metadata: v.optional(v.any()),
      uploadedAt: v.number(),
      updatedAt: v.number(),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await cloudinary.list(ctx, {
      limit: 20,
      order: "desc",
    });
  },
});
```

### Option 2: Direct Component Usage

You can also use the component functions directly:

```ts
// convex/images.ts
import { action, query } from "./_generated/server";
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
      tags: ["user-content"],
      config,
    });
  },
});
```

## API Reference

### CloudinaryClient Methods

#### `upload(ctx, base64Data, options?)`

Upload a file to Cloudinary and store metadata in the database.

```ts
const result = await cloudinary.upload(ctx, base64Data, {
  filename: "example.jpg",
  folder: "uploads",
  tags: ["user-content"],
  transformation: {
    width: 500,
    height: 500,
    crop: "fill",
  },
  publicId: "custom-id",
  userId: "user123",
});
```

**Parameters:**

- `ctx`: Convex action context
- `base64Data`: Base64 encoded file data (required)
- `options`: Upload options object (optional)

**Upload Options:**

- `filename`: Original filename (optional)
- `folder`: Cloudinary folder path (optional)
- `tags`: Array of tags for organization (optional)
- `transformation`: Image transformation parameters (optional)
- `publicId`: Custom public ID (optional)
- `userId`: User identifier for multi-tenancy (optional)

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

#### `transform(ctx, publicId, transformation)`

Generate a transformed URL for an existing image.

```ts
const { transformedUrl, secureUrl } = await cloudinary.transform(
  ctx,
  "sample-image",
  {
    width: 300,
    height: 300,
    crop: "fill",
    quality: "auto",
    format: "webp",
  }
);
```

**Parameters:**

- `ctx`: Convex query context
- `publicId`: Cloudinary public ID (required)
- `transformation`: Transformation parameters (required)

**Returns:**

```ts
{
  transformedUrl: string;
  secureUrl: string;
}
```

#### `delete(ctx, publicId)`

Delete an image from both Cloudinary and the database.

```ts
const result = await cloudinary.delete(ctx, "sample-image");
```

**Parameters:**

- `ctx`: Convex action context
- `publicId`: Cloudinary public ID (required)

**Returns:**

```ts
{
  success: boolean;
  error?: string;
}
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

**Parameters:**

- `ctx`: Convex query context
- `options`: List options (optional)

**List Options:**

- `userId`: Filter by user ID (optional)
- `folder`: Filter by folder (optional)
- `tags`: Filter by tags array (optional)
- `limit`: Maximum number of results (optional, default: 50)
- `orderBy`: Sort by "uploadedAt" or "updatedAt" (optional, default: "uploadedAt")
- `order`: Sort order "asc" or "desc" (optional, default: "asc")

**Returns:** Array of asset objects

#### `getAsset(ctx, publicId)`

Get detailed information about a specific asset.

```ts
const asset = await cloudinary.getAsset(ctx, "sample-image");
```

**Parameters:**

- `ctx`: Convex query context
- `publicId`: Cloudinary public ID (required)

**Returns:** Asset object or null if not found

#### `updateAsset(ctx, publicId, updates)`

Update asset metadata (tags, custom metadata).

```ts
const updated = await cloudinary.updateAsset(ctx, "sample-image", {
  tags: ["featured", "homepage"],
  metadata: { category: "product" },
});
```

**Parameters:**

- `ctx`: Convex mutation context
- `publicId`: Cloudinary public ID (required)
- `updates`: Object with tags and/or metadata (required)

**Returns:** Updated asset object or null if not found

### Direct Component Functions

If you prefer to use the component directly without the client wrapper:

```ts
// Upload
await ctx.runAction(components.cloudinary.lib.upload, {
  base64Data: "...",
  config: { cloudName, apiKey, apiSecret },
  // ... other options
});

// Transform
await ctx.runQuery(components.cloudinary.lib.transform, {
  publicId: "sample",
  transformation: { width: 300, height: 300 },
  config: { cloudName, apiKey, apiSecret },
});

// List assets
await ctx.runQuery(components.cloudinary.lib.listAssets, {
  folder: "uploads",
  config: { cloudName, apiKey, apiSecret },
});

// Delete asset
await ctx.runAction(components.cloudinary.lib.deleteAsset, {
  publicId: "sample",
  config: { cloudName, apiKey, apiSecret },
});
```

## Transformation Options

The component supports all Cloudinary transformation parameters:

```ts
interface CloudinaryTransformation {
  width?: number; // Resize width (1-4000)
  height?: number; // Resize height (1-4000)
  crop?: string; // "fill" | "fit" | "crop" | "scale" | "thumb" | "pad" | "limit"
  quality?: string | number; // "auto" | "best" | "good" | "eco" | "low" | 1-100
  format?: string; // "webp" | "jpg" | "png" | "avif" | "gif" | etc.
  gravity?: string; // "auto" | "face" | "center" | "north" | "south" | etc.
  radius?: number | string; // Border radius (0-2000) or "max" for circle
  overlay?: string; // Overlay image public_id
  effect?: string; // "grayscale" | "blur" | "sepia" | etc.
}
```

## Database Schema

The component automatically creates an `assets` table with the following structure:

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

**Indexes:**

- `by_publicId`: Fast lookup by Cloudinary public ID
- `by_userId`: Filter assets by user
- `by_folder`: Filter assets by folder
- `by_tags`: Filter assets by tags
- `by_uploadedAt`: Sort by upload time

## File Validation

The component automatically validates:

- **File Types**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, and more
- **File Size**: Maximum 10MB (configurable)
- **Dimensions**: Width/height between 1-4000 pixels
- **Format**: Valid file extensions and MIME types
- **Security**: Safe filename and folder path validation

## Error Handling

The component includes comprehensive error handling:

```ts
export const uploadWithErrorHandling = action({
  args: { base64Data: v.string() },
  handler: async (ctx, args) => {
    try {
      const result = await cloudinary.upload(ctx, args.base64Data, {
        folder: "uploads",
      });

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  },
});
```

## Best Practices

### Security

- Never expose Cloudinary credentials in client-side code
- Use environment variables for all API keys
- Validate file types and sizes before upload
- Implement user-based access controls

### Performance

- Use appropriate transformations for your use case
- Leverage Cloudinary's `f_auto,q_auto` for optimal delivery
- Implement asset cleanup for deleted content
- Use database indexes for efficient queries

### Organization

- Use folders to organize assets (`folder: "users/avatars"`)
- Tag assets for easy filtering (`tags: ["profile", "verified"]`)
- Use meaningful public_ids for important assets
- Implement asset cleanup for deleted content

### Environment Setup

Always validate environment variables:

```ts
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary environment variables not set");
}

const cloudinary = new CloudinaryClient(components.cloudinary, {
  cloudName,
  apiKey,
  apiSecret,
});
```

## Example Project

Run the complete example:

```bash
git clone https://github.com/imaxisXD/cloudinary-convex
cd cloudinary-component
npm run setup
npm run dev
```

The example includes:

- File upload with base64 conversion
- Real-time transformation preview
- Image gallery with management
- Error handling demonstrations
- Both CloudinaryClient and direct component usage examples

## Troubleshooting

### Common Issues

**"Credentials not found" error:**

- Verify environment variables are set in Convex
- Check Cloudinary dashboard for correct credentials
- Ensure variables are set in the correct Convex deployment

**Images not loading:**

- Verify the public_id exists in Cloudinary
- Check your cloud name is correct
- Ensure the asset hasn't been deleted

**Upload failures:**

- Check file size limits (default: 10MB for free accounts)
- Verify supported file formats
- Check network connectivity

**Type errors:**

- Run `npx convex dev` to regenerate types
- Ensure you're importing from the correct paths
- Check that the component is properly installed in convex.config.ts

**Missing config parameter:**

- Always pass the config object with Cloudinary credentials
- Use environment variables for sensitive data
- Ensure config is passed to all component functions

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md) for details.

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.

<!-- END: Include on https://convex.dev/components -->
