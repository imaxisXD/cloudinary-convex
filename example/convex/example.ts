import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { CloudinaryClient } from "../../src/client/index.js";

// Validate environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME environment variable not set. Run: npx convex env set CLOUDINARY_CLOUD_NAME your_cloud_name"
  );
}
if (!apiKey) {
  throw new Error(
    "CLOUDINARY_API_KEY environment variable not set. Run: npx convex env set CLOUDINARY_API_KEY your_api_key"
  );
}
if (!apiSecret) {
  throw new Error(
    "CLOUDINARY_API_SECRET environment variable not set. Run: npx convex env set CLOUDINARY_API_SECRET your_api_secret"
  );
}

// Configure Cloudinary component like Resend
const cloudinary = new CloudinaryClient(components.cloudinary, {
  cloudName,
  apiKey,
  apiSecret,
});

// Simple upload for testing - using the configured client
export const uploadImage = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.upload(ctx, args.base64Data, {
      filename: args.filename,
      folder: args.folder || "test-uploads",
      tags: ["test", "demo"],
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

// Upload with specific transformation - using the configured client
export const uploadImageWithTransform = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.upload(ctx, args.base64Data, {
      filename: args.filename,
      folder: "examples",
      tags: ["example", "demo"],
      transformation: {
        width: 400,
        height: 400,
        crop: "fill",
        quality: "auto",
        format: "webp",
      },
    });
  },
});

// Example: Delete an image - using the configured client
export const deleteImage = action({
  args: {
    publicId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.delete(ctx, args.publicId);
  },
});

// List all images (simple version for testing) - using the configured client
export const listImages = query({
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
  handler: async (ctx, _args) => {
    // Use the configured cloudinary client
    return await cloudinary.list(ctx, {
      limit: 20,
      order: "desc",
    });
  },
});

// List images with filters - using the configured client
export const listImagesWithFilters = query({
  args: {
    folder: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
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
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.list(ctx, {
      folder: args.folder,
      limit: args.limit ?? 10,
      order: "desc",
    });
  },
});

// Example: Generate a transformed URL for an existing image - using the configured client
export const getTransformedImageUrl = query({
  args: {
    publicId: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.object({
    transformedUrl: v.string(),
    secureUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.transform(ctx, args.publicId, {
      width: args.width ?? 300,
      height: args.height ?? 300,
      crop: "fill",
      quality: "auto",
    });
  },
});
