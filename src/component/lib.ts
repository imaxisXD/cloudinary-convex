import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  generateTransformationUrl,
  validateCloudinaryConfig,
  type CloudinaryUploadOptions,
} from "./apiUtils.js";

// Types for better type safety
const TransformationType = v.object({
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  crop: v.optional(v.string()),
  quality: v.optional(v.string()),
  format: v.optional(v.string()),
  gravity: v.optional(v.string()),
  radius: v.optional(v.union(v.number(), v.string())),
  overlay: v.optional(v.string()),
  effect: v.optional(v.string()),
});

const AssetType = v.object({
  _id: v.id("assets"),
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
});

// File validation constants
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 4000;

// Helper function to validate file data
function validateFileData(base64Data: string, filename?: string): void {
  if (!base64Data) {
    throw new Error("File data is required");
  }

  // Check if it's a valid base64 data URL
  const dataUrlPattern = /^data:([a-zA-Z0-9][a-zA-Z0-9/+]*);base64,(.+)$/;
  const match = base64Data.match(dataUrlPattern);

  if (!match) {
    throw new Error("Invalid file data format. Expected base64 data URL.");
  }

  const mimeType = match[1];
  const base64Content = match[2];

  // Validate MIME type
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`
    );
  }

  // Estimate file size (base64 is ~33% larger than original)
  const estimatedSize = (base64Content.length * 3) / 4;
  if (estimatedSize > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // Validate filename if provided
  if (filename) {
    const fileExtPattern = /\.[a-zA-Z0-9]+$/;
    if (!fileExtPattern.test(filename)) {
      throw new Error("Filename must have a valid extension");
    }
    if (filename.length > 255) {
      throw new Error("Filename too long (max 255 characters)");
    }
  }
}

// Helper function to validate transformation parameters
function validateTransformation(transformation: Record<string, unknown>): void {
  if (!transformation || typeof transformation !== "object") return;

  const { width, height, crop, quality, format, gravity, radius } =
    transformation;

  if (width !== undefined) {
    if (
      typeof width !== "number" ||
      width < MIN_DIMENSION ||
      width > MAX_DIMENSION
    ) {
      throw new Error(
        `Width must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`
      );
    }
  }

  if (height !== undefined) {
    if (
      typeof height !== "number" ||
      height < MIN_DIMENSION ||
      height > MAX_DIMENSION
    ) {
      throw new Error(
        `Height must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`
      );
    }
  }

  if (crop !== undefined) {
    if (typeof crop !== "string") {
      throw new Error("Crop must be a string");
    }
    const validCrops = [
      "fill",
      "fit",
      "crop",
      "scale",
      "thumb",
      "pad",
      "limit",
    ];
    if (!validCrops.includes(crop)) {
      throw new Error(
        `Invalid crop mode. Valid options: ${validCrops.join(", ")}`
      );
    }
  }

  if (quality !== undefined) {
    if (typeof quality === "string") {
      const validQualities = ["auto", "best", "good", "eco", "low"];
      if (!validQualities.includes(quality)) {
        throw new Error(
          `Invalid quality preset. Valid options: ${validQualities.join(", ")}`
        );
      }
    } else if (typeof quality === "number") {
      if (quality < 1 || quality > 100) {
        throw new Error("Quality number must be between 1 and 100");
      }
    } else {
      throw new Error("Quality must be a string or number");
    }
  }

  if (format !== undefined) {
    if (typeof format !== "string") {
      throw new Error("Format must be a string");
    }
    const validFormats = [
      "jpg",
      "png",
      "gif",
      "bmp",
      "ico",
      "pdf",
      "tiff",
      "eps",
      "jpc",
      "jp2",
      "psd",
      "webp",
      "zip",
      "svg",
      "webm",
      "wdp",
      "hpx",
      "djvu",
      "ai",
      "flif",
      "bpg",
      "miff",
      "tga",
      "heic",
      "avif",
    ];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(
        `Invalid format. Supported formats: ${validFormats.join(", ")}`
      );
    }
  }

  if (gravity !== undefined) {
    if (typeof gravity !== "string") {
      throw new Error("Gravity must be a string");
    }
    const validGravities = [
      "auto",
      "center",
      "north",
      "south",
      "east",
      "west",
      "north_east",
      "north_west",
      "south_east",
      "south_west",
      "face",
      "faces",
      "body",
      "adv_face",
      "adv_faces",
      "adv_eyes",
      "liquid",
      "ocr_text",
    ];
    if (!validGravities.includes(gravity)) {
      throw new Error(
        `Invalid gravity. Valid options: ${validGravities.join(", ")}`
      );
    }
  }

  if (radius !== undefined) {
    if (typeof radius === "number" && (radius < 0 || radius > 2000)) {
      throw new Error("Radius must be between 0 and 2000");
    } else if (typeof radius === "string" && radius !== "max") {
      throw new Error('Radius string value must be "max"');
    }
  }
}

// Helper function to validate upload options
function validateUploadOptions(options: Record<string, unknown>): void {
  if (!options) return;

  const { folder, tags, publicId } = options;

  if (folder !== undefined) {
    if (typeof folder !== "string") {
      throw new Error("Folder must be a string");
    }
    if (folder.length > 200) {
      throw new Error("Folder path too long (max 200 characters)");
    }
    if (!/^[a-zA-Z0-9/\-_]+$/.test(folder)) {
      throw new Error(
        "Folder contains invalid characters. Use only letters, numbers, hyphens, underscores, and forward slashes"
      );
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw new Error("Tags must be an array");
    }
    if (tags.length > 100) {
      throw new Error("Too many tags (max 100)");
    }
    for (const tag of tags) {
      if (typeof tag !== "string") {
        throw new Error("All tags must be strings");
      }
      if (tag.length > 30) {
        throw new Error("Tag too long (max 30 characters)");
      }
      if (!/^[a-zA-Z0-9\-_]+$/.test(tag)) {
        throw new Error(
          "Tag contains invalid characters. Use only letters, numbers, hyphens, and underscores"
        );
      }
    }
  }

  if (publicId !== undefined) {
    if (typeof publicId !== "string") {
      throw new Error("Public ID must be a string");
    }
    if (publicId.length > 255) {
      throw new Error("Public ID too long (max 255 characters)");
    }
    if (!/^[a-zA-Z0-9/\-_.]+$/.test(publicId)) {
      throw new Error(
        "Public ID contains invalid characters. Use only letters, numbers, hyphens, underscores, forward slashes, and dots"
      );
    }
  }
}

// Internal function to validate config
function validateConfig(config: {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}) {
  if (!config.cloudName) {
    throw new Error("Cloudinary cloud name is required");
  }
  if (!config.apiKey) {
    throw new Error("Cloudinary API key is required");
  }
  if (!config.apiSecret) {
    throw new Error("Cloudinary API secret is required");
  }
  return config as {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

// Internal mutation to store asset in database
export const storeAsset = internalMutation({
  args: {
    publicId: v.string(),
    cloudinaryUrl: v.string(),
    secureUrl: v.string(),
    originalFilename: v.optional(v.string()),
    format: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    bytes: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    metadata: v.optional(v.any()),
    userId: v.optional(v.string()),
  },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("assets", {
      ...args,
      uploadedAt: now,
      updatedAt: now,
    });
  },
});

// Generate transformed URL without uploading new image
export const transform = query({
  args: {
    publicId: v.string(),
    transformation: TransformationType,
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
  },
  returns: v.object({
    transformedUrl: v.string(),
    secureUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate inputs
    if (!args.publicId || args.publicId.trim().length === 0) {
      throw new Error("Public ID is required");
    }

    validateTransformation(args.transformation);
    const config = validateConfig(args.config);

    // Validate public ID format
    if (!/^[a-zA-Z0-9/\-_.]+$/.test(args.publicId)) {
      throw new Error("Invalid public ID format");
    }

    // Generate transformation URL using API utility
    const result = generateTransformationUrl(
      config.cloudName,
      args.publicId,
      args.transformation
    );

    return result;
  },
});

// Internal mutation to delete asset from database
export const deleteAssetFromDB = internalMutation({
  args: {
    publicId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (asset) {
      await ctx.db.delete(asset._id);
    }
  },
});

// List assets with filtering and pagination
export const listAssets = query({
  args: {
    userId: v.optional(v.string()),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    orderBy: v.optional(
      v.union(v.literal("uploadedAt"), v.literal("updatedAt"))
    ),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
  },
  returns: v.array(AssetType),
  handler: async (ctx, args) => {
    // Apply filters and get assets
    let assets;
    if (args.userId) {
      const userAssets = await ctx.db
        .query("assets")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .order(args.order === "desc" ? "desc" : "asc")
        .take(args.limit ?? 50);
      assets = userAssets;
    } else if (args.folder) {
      const folderAssets = await ctx.db
        .query("assets")
        .withIndex("by_folder", (q) => q.eq("folder", args.folder!))
        .order(args.order === "desc" ? "desc" : "asc")
        .take(args.limit ?? 50);
      assets = folderAssets;
    } else {
      const allAssets = await ctx.db
        .query("assets")
        .withIndex("by_uploadedAt")
        .order(args.order === "desc" ? "desc" : "asc")
        .take(args.limit ?? 50);
      assets = allAssets;
    }

    // Filter by tags if specified
    if (args.tags && args.tags.length > 0) {
      assets = assets.filter((asset) =>
        args.tags!.some((tag) => asset.tags?.includes(tag))
      );
    }

    return assets;
  },
});

// Get single asset details
export const getAsset = query({
  args: {
    publicId: v.string(),
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
  },
  returns: v.union(AssetType, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();
  },
});

// Update asset metadata
export const updateAsset = mutation({
  args: {
    publicId: v.string(),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  returns: v.union(AssetType, v.null()),
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!asset) {
      return null;
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.tags !== undefined) {
      updates.tags = args.tags;
    }
    if (args.metadata !== undefined) {
      updates.metadata = args.metadata;
    }

    await ctx.db.patch(asset._id, updates);

    return {
      ...asset,
      ...updates,
    };
  },
});

// Upload action using direct Cloudinary API
export const upload = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    transformation: v.optional(TransformationType),
    publicId: v.optional(v.string()),
    userId: v.optional(v.string()),
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    publicId: v.optional(v.string()),
    secureUrl: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
    bytes: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Validate input data
      validateFileData(args.base64Data, args.filename);

      if (args.transformation) {
        validateTransformation(args.transformation);
      }

      const uploadOptions: Record<string, unknown> = {};
      if (args.folder) uploadOptions.folder = args.folder;
      if (args.tags) uploadOptions.tags = args.tags;
      if (args.publicId) uploadOptions.publicId = args.publicId;

      validateUploadOptions(uploadOptions);

      // Validate Cloudinary credentials
      const config = validateConfig(args.config);

      validateCloudinaryConfig(
        config.cloudName,
        config.apiKey,
        config.apiSecret
      );

      // Prepare upload options
      const cloudinaryOptions: CloudinaryUploadOptions = {
        filename: args.filename,
        folder: args.folder,
        tags: args.tags,
        publicId: args.publicId,
        userId: args.userId,
      };

      if (args.transformation) {
        cloudinaryOptions.transformation = args.transformation;
      }

      // Upload to Cloudinary
      const uploadResponse = await uploadToCloudinary(
        config.cloudName,
        config.apiKey,
        config.apiSecret,
        args.base64Data,
        cloudinaryOptions
      );

      // Store asset metadata in database
      await ctx.runMutation(internal.lib.storeAsset, {
        publicId: uploadResponse.public_id,
        cloudinaryUrl: uploadResponse.url,
        secureUrl: uploadResponse.secure_url,
        originalFilename: args.filename,
        format: uploadResponse.format,
        width: uploadResponse.width,
        height: uploadResponse.height,
        bytes: uploadResponse.bytes,
        tags: uploadResponse.tags,
        folder: args.folder,
        userId: args.userId,
      });

      return {
        success: true,
        publicId: uploadResponse.public_id,
        secureUrl: uploadResponse.secure_url,
        width: uploadResponse.width,
        height: uploadResponse.height,
        format: uploadResponse.format,
        bytes: uploadResponse.bytes,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  },
});

// Delete action using direct Cloudinary API
export const deleteAsset = action({
  args: {
    publicId: v.string(),
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Validate Cloudinary credentials
      const config = validateConfig(args.config);

      validateCloudinaryConfig(
        config.cloudName,
        config.apiKey,
        config.apiSecret
      );

      // Delete from Cloudinary
      const deleteResponse = await deleteFromCloudinary(
        config.cloudName,
        config.apiKey,
        config.apiSecret,
        args.publicId
      );

      // Delete from database
      await ctx.runMutation(internal.lib.deleteAssetFromDB, {
        publicId: args.publicId,
      });

      return {
        success: deleteResponse.result === "ok",
      };
    } catch (error) {
      console.error("Delete failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  },
});
