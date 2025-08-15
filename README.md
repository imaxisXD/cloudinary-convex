# Cloudinary Component for Convex

[![npm version](https://badge.fury.io/js/cloudinary-component.svg)](https://badge.fury.io/js/cloudinary-component)

A comprehensive Cloudinary integration component for Convex that provides image upload, transformation, and management capabilities using direct Cloudinary REST APIs with full TypeScript support and React components.

<!-- START: Include on https://convex.dev/components -->

## Features

✨ **Easy Image Upload**: Drag & drop or programmatic upload to Cloudinary  
🎨 **Dynamic Transformations**: Real-time image transformations (resize, crop, effects)  
🗃️ **Asset Management**: Track and manage all uploaded assets in your Convex database  
⚛️ **React Components**: Pre-built React components and hooks  
🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions  
🔒 **Secure**: Environment-based credential management  
📱 **Responsive**: Works seamlessly across devices

Why use this component?

- **Direct API Integration**: Uses Cloudinary REST APIs directly instead of SDKs for better control and reduced dependencies
- **Seamless Integration**: Native Convex integration with real-time updates
- **Production Ready**: Built-in error handling, validation, and secure signature generation
- **Developer Experience**: Rich TypeScript types and intuitive API
- **Performance**: Optimized image delivery through Cloudinary's global CDN

Found a bug? Feature request? [File it here](https://github.com/your-username/cloudinary-component/issues).

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

### Backend Usage

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
    // Use the component directly - no wrapper needed!
    return await ctx.runAction(components.cloudinary.lib.upload, {
      base64Data: args.base64Data,
      filename: args.filename,
      folder: "uploads",
      tags: ["user-content"],
      transformation: {
        width: 500,
        height: 500,
        crop: "fill",
        quality: "auto",
      },
    });
  },
});

export const getImages = query({
  args: {},
  handler: async (ctx) => {
    // Use the component directly - no wrapper needed!
    return await ctx.runQuery(components.cloudinary.lib.listAssets, {
      folder: "uploads",
      limit: 20,
      order: "desc",
    });
  },
});
```

### React Frontend Usage

```tsx
// app/ImageGallery.tsx
import {
  CloudinaryUpload,
  CloudinaryImage,
  useCloudinaryAssets,
} from "cloudinary-component/react";
import { useQuery } from "convex/react";
import { api, components } from "../convex/_generated/api";

export function ImageGallery() {
  const images = useQuery(api.images.getImages);

  return (
    <div>
      {/* Upload Component */}
      <CloudinaryUpload
        component={components.cloudinary}
        onUploadComplete={(result) => {
          console.log("Upload complete:", result);
        }}
        options={{ folder: "uploads", tags: ["gallery"] }}
        accept="image/*"
        multiple
      />

      {/* Image Grid */}
      <div className="image-grid">
        {images?.map((image) => (
          <CloudinaryImage
            key={image.publicId}
            component={components.cloudinary}
            publicId={image.publicId}
            transformation={{
              width: 300,
              height: 300,
              crop: "fill",
            }}
            alt={image.originalFilename || "Uploaded image"}
          />
        ))}
      </div>
    </div>
  );
}
```

## API Reference

### Direct Component Usage (Recommended)

The easiest way is to use the component functions directly:

```ts
// Direct usage - recommended approach
await ctx.runAction(components.cloudinary.lib.upload, { ... });
await ctx.runQuery(components.cloudinary.lib.listAssets, { ... });
await ctx.runAction(components.cloudinary.lib.deleteAsset, { ... });
```

### CloudinaryClient (Alternative Pattern)

If you prefer a client wrapper pattern, you can also use the CloudinaryClient:

#### Methods

##### `upload(ctx, base64Data, options?)`

Upload a file to Cloudinary and store metadata in the database.

```ts
const result = await cloudinary.upload(ctx, base64Data, {
  filename: "example.jpg",
  folder: "uploads",
  tags: ["user-content"],
  transformation: { width: 500, height: 500, crop: "fill" },
  publicId: "custom-id",
  userId: "user123",
});
```

##### `transform(ctx, publicId, transformation)`

Generate a transformed URL for an existing image.

```ts
const { transformedUrl } = await cloudinary.transform(ctx, "sample-image", {
  width: 300,
  height: 300,
  crop: "fill",
  quality: "auto",
  format: "webp",
});
```

##### `delete(ctx, publicId)`

Delete an image from both Cloudinary and the database.

```ts
const result = await cloudinary.delete(ctx, "sample-image");
```

##### `list(ctx, options?)`

List stored assets with filtering and pagination.

```ts
const images = await cloudinary.list(ctx, {
  userId: "user123",
  folder: "uploads",
  tags: ["featured"],
  limit: 10,
  order: "desc",
});
```

##### `getAsset(ctx, publicId)`

Get detailed information about a specific asset.

```ts
const asset = await cloudinary.getAsset(ctx, "sample-image");
```

##### `updateAsset(ctx, publicId, updates)`

Update asset metadata (tags, custom metadata).

```ts
const updated = await cloudinary.updateAsset(ctx, "sample-image", {
  tags: ["featured", "homepage"],
  metadata: { category: "product" },
});
```

### React Hooks

#### `useCloudinaryUpload(component)`

Manage file uploads with progress tracking.

```tsx
const { upload, isUploading, progress, error, result, reset } =
  useCloudinaryUpload(components.cloudinary);

const handleFileUpload = async (file: File) => {
  try {
    const result = await upload(file, {
      folder: "user-uploads",
      tags: ["profile"],
    });
    console.log("Upload successful:", result);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

#### `useCloudinaryImage(component, publicId, transformation?)`

Generate transformed image URLs.

```tsx
const { transformedUrl, secureUrl, isLoading } = useCloudinaryImage(
  components.cloudinary,
  "sample-image",
  { width: 400, height: 300, crop: "fill" }
);
```

#### `useCloudinaryAssets(component, options?)`

List assets with real-time updates.

```tsx
const { assets, isLoading } = useCloudinaryAssets(components.cloudinary, {
  folder: "uploads",
  limit: 20,
});
```

#### `useCloudinaryOperations(component)`

Asset management operations.

```tsx
const { deleteAsset, updateAsset } = useCloudinaryOperations(
  components.cloudinary
);

const handleDelete = async (publicId: string) => {
  await deleteAsset(publicId);
};
```

### React Components

#### `<CloudinaryUpload>`

Drag & drop file upload component.

```tsx
<CloudinaryUpload
  component={components.cloudinary}
  onUploadComplete={(result) => console.log(result)}
  onUploadError={(error) => console.error(error)}
  options={{
    folder: "uploads",
    tags: ["user-content"],
  }}
  accept="image/*"
  multiple
  className="upload-zone"
>
  <div>Drop files here or click to upload</div>
</CloudinaryUpload>
```

#### `<CloudinaryImage>`

Optimized image component with transformation support.

```tsx
<CloudinaryImage
  component={components.cloudinary}
  publicId="sample-image"
  transformation={{
    width: 400,
    height: 300,
    crop: "fill",
    quality: "auto",
    format: "webp",
  }}
  alt="Sample image"
  className="responsive-image"
  loader={<div>Loading...</div>}
  fallback={<div>Failed to load</div>}
/>
```

## Transformation Options

The component supports all Cloudinary transformation parameters:

```ts
interface CloudinaryTransformation {
  width?: number; // Resize width
  height?: number; // Resize height
  crop?: string; // "fill" | "fit" | "crop" | "scale" | "thumb"
  quality?: string; // "auto" | "best" | "good" | 1-100
  format?: string; // "webp" | "jpg" | "png" | "avif"
  gravity?: string; // "auto" | "face" | "center" | "north"
  radius?: number | string; // Border radius or "max" for circle
  overlay?: string; // Overlay image public_id
  effect?: string; // "grayscale" | "blur" | "sepia" | etc.
}
```

## Error Handling

The component includes comprehensive error handling:

```ts
// Server-side error handling
export const uploadWithErrorHandling = action({
  args: { base64Data: v.string() },
  handler: async (ctx, args) => {
    try {
      const result = await cloudinary.upload(ctx, args.base64Data);
      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      throw error; // Re-throw to handle in frontend
    }
  },
});
```

```tsx
// React error handling
function UploadComponent() {
  const { upload, error } = useCloudinaryUpload(components.cloudinary);

  const handleUpload = async (file: File) => {
    try {
      await upload(file);
    } catch (error) {
      // Handle upload error
      setErrorMessage(error.message);
    }
  };

  return (
    <div>
      {error && <div className="error">Upload failed: {error}</div>}
      {/* Upload UI */}
    </div>
  );
}
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
- Implement lazy loading for image galleries
- Cache transformed URLs when possible

### Organization

- Use folders to organize assets (`folder: "users/avatars"`)
- Tag assets for easy filtering (`tags: ["profile", "verified"]`)
- Use meaningful public_ids for important assets
- Implement asset cleanup for deleted content

## Example Project

Run the complete example:

```bash
git clone https://github.com/your-username/cloudinary-component
cd cloudinary-component
npm run setup
npm run dev
```

The example includes:

- File upload with drag & drop
- Real-time transformation preview
- Image gallery with management
- Error handling demonstrations

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

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md) for details.

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.

<!-- END: Include on https://convex.dev/components -->
