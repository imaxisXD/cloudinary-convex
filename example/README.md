# Cloudinary Component Example

This example demonstrates how to use the Cloudinary component with Convex for image upload, transformation, and management using **direct REST API calls** (no SDK dependencies!).

## Features Demonstrated

- 📤 **File Upload**: Drag & drop or click to upload images
- 🖼️ **Image Display**: Show images with real-time transformations
- 🎛️ **Transformation Controls**: Adjust width, height, and crop settings
- 🗑️ **Asset Management**: Delete images from Cloudinary and database
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
