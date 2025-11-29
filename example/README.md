# Cloudinary Component Example

This example demonstrates how to use the Cloudinary component with Convex for image upload, transformation, and management using **direct REST API calls** (no SDK dependencies!).

## Features Demonstrated

- 📤 **File Upload**: Two upload methods based on file size
  - 📄 **Base64 Upload**: Small files (< 5MB) through Convex
  - 🚀 **Direct Upload**: Large files (≥ 5MB) directly to Cloudinary
- 🖼️ **Image Display**: Show images with real-time transformations
- 🎛️ **Transformation Controls**: Adjust width, height, and crop settings
- 🗑️ **Asset Management**: Delete images from Cloudinary and database
- 📊 **Upload Progress**: Real-time progress tracking for direct uploads
- 📱 **Responsive Design**: Works on desktop and mobile
- 🚀 **Direct API Calls**: No SDK dependencies, better performance and control
- 🔒 **Secure**: Built-in signature generation for authenticated uploads

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in your credentials:

**Cloudinary Setup:**

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up or log in
3. Copy your Cloud Name, API Key, and API Secret
4. Update `.env.local` with these values

**Convex Setup:**

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Create a new project or select an existing one
3. Copy your deployment URL
4. Update `.env.local` with the Convex deployment URL

### 3. Set Environment Variables in Convex

Set your Cloudinary credentials in Convex:

```bash
npx convex env set CLOUDINARY_CLOUD_NAME your_cloud_name_here
npx convex env set CLOUDINARY_API_KEY your_api_key_here
npx convex env set CLOUDINARY_API_SECRET your_api_secret_here
```

### 4. Initialize Convex

```bash
npx convex dev
```

### 5. Start the Development Server

In a new terminal:

```bash
npm run dev
```

## Testing Upload Methods

The example app automatically chooses the upload method based on file size:

### Automatic Method Selection

- **Small files (< 5MB)**: Uses base64 upload through Convex
- **Large files (≥ 5MB)**: Uses direct upload to Cloudinary

### Testing Different File Sizes

1. **Test Small File Upload (Base64)**:

   - Choose any image under 5MB
   - Upload will go through Convex backend
   - Progress shows "Processing base64 data..."

2. **Test Large File Upload (Direct)**:
   - Choose any image 5MB or larger
   - Upload goes directly to Cloudinary
   - Progress bar shows real-time upload progress

### ⚠️ Cloudinary Plan Limits

Be aware of your Cloudinary plan's file size limits when testing:

| Plan         | Max Image | Max Video |
| ------------ | --------- | --------- |
| **Free**     | 10 MB     | 100 MB    |
| **Plus**     | 20 MB     | 2 GB      |
| **Advanced** | 40 MB     | 4 GB      |

> **Tip:** If uploads fail for large files, check that the file doesn't exceed your plan's limits. See [Cloudinary Pricing](https://cloudinary.com/pricing/compare-plans) for details.

### What You'll See

- **File size detection** in the UI
- **Upload method** displayed during upload
- **Progress tracking** for direct uploads
- **Success message** showing which method was used
- **Console logs** showing the upload flow

## Usage Examples

### Basic Upload

```typescript
import { CloudinaryUpload } from "cloudinary-component/react";
import { components } from "../convex/_generated/api";

<CloudinaryUpload
  component={components.cloudinary}
  onUploadComplete={(result) => console.log('Uploaded:', result)}
  options={{ folder: "my-uploads", tags: ["demo"] }}
/>
```

### Display with Transformations

```typescript
import { CloudinaryImage } from "cloudinary-component/react";

<CloudinaryImage
  component={components.cloudinary}
  publicId="sample-image"
  transformation={{
    width: 300,
    height: 300,
    crop: "fill"
  }}
  alt="Sample image"
/>
```

### Server-side Operations

**✅ Recommended: Direct Component Usage (No SDK, No Wrappers)**

```typescript
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

// Upload with transformations
export const uploadImage = action({
  args: { base64Data: v.string() },
  handler: async (ctx, args) => {
    // Use component directly - no wrapper needed!
    return await ctx.runAction(components.cloudinary.lib.upload, {
      base64Data: args.base64Data,
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

// List assets
export const getImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.cloudinary.lib.listAssets, {
      folder: "uploads",
      limit: 20,
      order: "desc",
    });
  },
});
```

## File Structure

```
example/
├── convex/
│   ├── convex.config.ts    # Component configuration
│   └── example.ts          # Backend functions
├── src/
│   ├── App.tsx            # Main React app
│   └── App.css           # Styling
├── .env.example          # Environment template
└── README.md            # This file
```

## Troubleshooting

**Upload fails with "credentials not found":**

- Check that environment variables are set in Convex
- Verify your Cloudinary credentials are correct

**Images don't load:**

- Check that the public_id is correct
- Verify your Cloudinary cloud name is set

**Component not found errors:**

- Run `npm run build` in the root directory
- Make sure you've run `npx convex dev` to generate types
