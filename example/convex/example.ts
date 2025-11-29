import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { CloudinaryClient } from "../../src/client/index.js";
// Import shared validators from the component for consistent type definitions
// Use vAssetResponse for external consumers (IDs are serialized as strings across component boundaries)
// Use vCloudinaryUploadResponse for direct upload result validation
import {
  vAssetResponse,
  vCloudinaryUploadResponse,
} from "../../src/component/lib.js";

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

// Enhanced transformation options interface
const TransformationOptions = v.object({
  // Basic transformations
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  crop: v.optional(v.string()),
  gravity: v.optional(v.string()),
  quality: v.optional(v.union(v.string(), v.number())),
  format: v.optional(v.string()),

  // Effects and enhancements
  effect: v.optional(v.string()),
  radius: v.optional(v.union(v.number(), v.string())),
  overlay: v.optional(v.string()),
  underlay: v.optional(v.string()),

  // Color and artistic effects
  brightness: v.optional(v.number()),
  contrast: v.optional(v.number()),
  saturation: v.optional(v.number()),
  hue: v.optional(v.number()),
  gamma: v.optional(v.number()),

  // Advanced transformations
  angle: v.optional(v.number()),
  flip: v.optional(v.string()),
  rotation: v.optional(v.number()),
  zoom: v.optional(v.number()),

  // Responsive and optimization
  responsive: v.optional(v.boolean()),
  auto: v.optional(v.string()),
  fetchFormat: v.optional(v.string()),
});

// Simple base64 upload for small to medium files
export const uploadImage = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use regular base64 upload through Convex
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

// Direct upload for large files (client-side only)
export const uploadImageDirect = action({
  args: {
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    uploadParams: v.object({
      api_key: v.string(),
      timestamp: v.string(),
      signature: v.string(),
      folder: v.optional(v.string()),
      tags: v.optional(v.string()),
      transformation: v.optional(v.string()),
      public_id: v.optional(v.string()),
    }),
  }),
  handler: async (ctx, args) => {
    // Generate upload credentials for direct upload
    return await cloudinary.generateUploadCredentials(ctx, {
      filename: args.filename,
      folder: args.folder || "direct-uploads",
      tags: args.tags || ["direct", "large-file"],
      transformation:
        args.width || args.height
          ? {
              width: args.width,
              height: args.height,
              crop: "fill",
              quality: "auto",
            }
          : undefined,
    });
  },
});

// Finalize direct upload by storing metadata
export const finalizeDirectUpload = action({
  args: {
    publicId: v.string(),
    // Use the shared validator for Cloudinary upload responses
    uploadResult: vCloudinaryUploadResponse,
    userId: v.optional(v.string()),
    folder: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    assetId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const assetId = await ctx.runMutation(
        cloudinary.component.lib.finalizeUpload,
        {
          publicId: args.publicId,
          uploadResult: args.uploadResult,
          userId: args.userId,
          folder: args.folder,
        }
      );

      return {
        success: true,
        assetId: assetId,
      };
    } catch (error) {
      console.error("Failed to finalize direct upload:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Finalization failed",
      };
    }
  },
});

// Upload with specific transformation using base64 upload
export const uploadImageWithTransform = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use base64 upload with transformation
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
  // Using shared vAssetResponse validator from component for consistent type definitions
  returns: v.array(vAssetResponse),
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
  // Using shared vAssetResponse validator from component for consistent type definitions
  returns: v.array(vAssetResponse),
  handler: async (ctx, args) => {
    // Use the configured cloudinary client
    return await cloudinary.list(ctx, {
      folder: args.folder,
      limit: args.limit ?? 10,
      order: "desc",
    });
  },
});

// Enhanced transformation function with comprehensive options
export const getTransformedImageUrl = query({
  args: {
    publicId: v.string(),
    transformation: TransformationOptions,
  },
  returns: v.object({
    transformedUrl: v.string(),
    secureUrl: v.string(),
    publicId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generate transformation URL manually for comprehensive options
    const transformations: string[] = [];

    // Basic transformations
    if (args.transformation.width)
      transformations.push(`w_${args.transformation.width}`);
    if (args.transformation.height)
      transformations.push(`h_${args.transformation.height}`);
    if (args.transformation.crop)
      transformations.push(`c_${args.transformation.crop}`);
    if (args.transformation.gravity)
      transformations.push(`g_${args.transformation.gravity}`);
    if (args.transformation.quality)
      transformations.push(`q_${args.transformation.quality}`);
    if (args.transformation.format)
      transformations.push(`f_${args.transformation.format}`);

    // Effects and enhancements
    if (args.transformation.effect)
      transformations.push(`e_${args.transformation.effect}`);
    if (args.transformation.radius)
      transformations.push(`r_${args.transformation.radius}`);
    if (args.transformation.overlay)
      transformations.push(`l_${args.transformation.overlay}`);
    if (args.transformation.underlay)
      transformations.push(`u_${args.transformation.underlay}`);

    // Color and artistic effects
    if (args.transformation.brightness)
      transformations.push(`b_${args.transformation.brightness}`);
    if (args.transformation.contrast)
      transformations.push(`co_${args.transformation.contrast}`);
    if (args.transformation.saturation)
      transformations.push(`s_${args.transformation.saturation}`);
    if (args.transformation.hue)
      transformations.push(`hue_${args.transformation.hue}`);
    if (args.transformation.gamma)
      transformations.push(`g_${args.transformation.gamma}`);

    // Advanced transformations
    if (args.transformation.angle)
      transformations.push(`a_${args.transformation.angle}`);
    if (args.transformation.flip)
      transformations.push(`fl_${args.transformation.flip}`);
    if (args.transformation.rotation)
      transformations.push(`a_${args.transformation.rotation}`);
    if (args.transformation.zoom)
      transformations.push(`z_${args.transformation.zoom}`);

    // Responsive and optimization
    if (args.transformation.responsive) transformations.push(`c_auto`);
    if (args.transformation.auto) transformations.push(`f_auto,q_auto`);
    if (args.transformation.fetchFormat)
      transformations.push(`f_${args.transformation.fetchFormat}`);

    // Build the transformation URL
    let transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;

    if (transformations.length > 0) {
      transformedUrl += `/${transformations.join(",")}`;
    }

    transformedUrl += `/${args.publicId}`;

    // Get the original secure URL for comparison
    const originalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${args.publicId}`;

    return {
      transformedUrl,
      secureUrl: originalUrl,
      publicId: args.publicId,
    };
  },
});

// Simple transformation function for basic width/height
export const getTransformedImageUrlSimple = query({
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
    // Generate simple transformation URL
    const transformations: string[] = [];

    if (args.width) transformations.push(`w_${args.width}`);
    if (args.height) transformations.push(`h_${args.height}`);

    let transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;

    if (transformations.length > 0) {
      transformedUrl += `/${transformations.join(",")}`;
    }

    transformedUrl += `/${args.publicId}`;

    const originalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${args.publicId}`;

    return {
      transformedUrl,
      secureUrl: originalUrl,
    };
  },
});

// Get transformation presets for the frontend
export const getTransformationPresets = query({
  args: {},
  returns: v.record(v.string(), v.any()),
  handler: async (_ctx, _args) => {
    return {
      "Basic Resize": { width: 300, height: 300, crop: "fill" },
      "Square Thumbnail": {
        width: 150,
        height: 150,
        crop: "thumb",
        gravity: "face",
      },
      Landscape: { width: 800, height: 400, crop: "fill" },
      Portrait: { width: 400, height: 600, crop: "fill" },
      Circle: { width: 200, height: 200, crop: "fill", radius: "max" },
      "Rounded Corners": { width: 300, height: 300, crop: "fill", radius: 20 },
      "Black & White": { effect: "blackwhite" },
      Sepia: { effect: "sepia" },
      Vintage: { effect: "art:audrey" },
      "Oil Painting": { effect: "oil_paint:6" },
      Sketch: { effect: "sketch" },
      Blur: { effect: "blur:300" },
      Sharpen: { effect: "sharpen" },
      Brightness: { brightness: 20 },
      Contrast: { contrast: 20 },
      Saturation: { saturation: -50 },
      Grayscale: { effect: "grayscale" },
      Invert: { effect: "invert" },
      Pixelate: { effect: "pixelate:15" },
      Cartoon: { effect: "cartoonify:70" },
    };
  },
});
