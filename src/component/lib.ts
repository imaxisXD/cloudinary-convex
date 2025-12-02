import { v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
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
  generateDirectUploadCredentials,
  type CloudinaryUploadOptions,
} from "./apiUtils.js";

// ============================================================================
// VALIDATORS
// Following Convex convention: "vValidatorName" or "ValidatorNameValidator"
// Types are derived using Infer<> for type safety
// ============================================================================

/**
 * Validator for Cloudinary transformation options.
 * Use this for specifying image transformations like resize, crop, effects, etc.
 *
 * @see CloudinaryTransformation in apiUtils.ts for detailed documentation of each option
 */
export const vTransformation = v.object({
  // Dimensions
  width: v.optional(v.number()),
  height: v.optional(v.number()),

  // Crop and positioning
  crop: v.optional(v.string()),
  gravity: v.optional(v.string()),
  x: v.optional(v.number()),
  y: v.optional(v.number()),
  zoom: v.optional(v.number()),
  aspectRatio: v.optional(v.union(v.string(), v.number())),

  // Quality and format
  quality: v.optional(v.union(v.string(), v.number())),
  format: v.optional(v.string()),
  dpr: v.optional(v.union(v.number(), v.string())),

  // Visual modifications
  radius: v.optional(v.union(v.number(), v.string())),
  angle: v.optional(v.union(v.number(), v.string())),
  effect: v.optional(v.string()),
  opacity: v.optional(v.number()),

  // Colors and backgrounds
  background: v.optional(v.string()),
  color: v.optional(v.string()),
  border: v.optional(v.string()),

  // Overlays
  overlay: v.optional(v.string()),

  // Document handling
  density: v.optional(v.number()),
  page: v.optional(v.number()),

  // Default image
  defaultImage: v.optional(v.string()),

  // Named transformation
  namedTransformation: v.optional(v.string()),

  // Flags
  flags: v.optional(v.union(v.string(), v.array(v.string()))),

  // Raw transformation
  rawTransformation: v.optional(v.string()),
});

/** TypeScript type for Cloudinary transformations, derived from vTransformation validator */
export type Transformation = Infer<typeof vTransformation>;

/**
 * Validator for a Cloudinary asset stored in the database (internal use).
 * Includes all fields returned when querying assets.
 * Use this within the component where Id<"assets"> is valid.
 */
export const vAsset = v.object({
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

/** TypeScript type for a Cloudinary asset, derived from vAsset validator */
export type Asset = Infer<typeof vAsset>;

/**
 * Validator for a Cloudinary asset returned to external consumers.
 * When crossing component boundaries, IDs are serialized as strings.
 * Use this in your app's Convex functions when calling the component.
 */
export const vAssetResponse = v.object({
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
});

/** TypeScript type for asset responses, derived from vAssetResponse validator */
export type AssetResponse = Infer<typeof vAssetResponse>;

/**
 * Validator for the raw Cloudinary upload API response.
 * Based on Cloudinary's official Upload API documentation.
 * @see https://cloudinary.com/documentation/image_upload_api_reference
 *
 * Includes all documented fields that Cloudinary may return in an upload response.
 */
export const vCloudinaryUploadResponse = v.object({
  // ============================================
  // REQUIRED FIELDS - Always present in response
  // ============================================

  /** The unique public identifier assigned to the asset */
  public_id: v.string(),

  /** HTTPS URL for accessing the uploaded asset */
  secure_url: v.string(),

  /** HTTP URL for accessing the uploaded asset */
  url: v.string(),

  /** The format (extension) of the uploaded asset (e.g., "jpg", "png", "webp") */
  format: v.string(),

  // ============================================
  // DIMENSION & SIZE FIELDS
  // ============================================

  /** Width of the asset in pixels */
  width: v.optional(v.number()),

  /** Height of the asset in pixels */
  height: v.optional(v.number()),

  /** Size of the asset in bytes */
  bytes: v.optional(v.number()),

  /** Number of pages (for multi-page documents like PDFs) */
  pages: v.optional(v.number()),

  // ============================================
  // IDENTIFICATION FIELDS
  // ============================================

  /** Unique asset identifier (internal Cloudinary ID) */
  asset_id: v.optional(v.string()),

  /** Version number of the asset (Unix timestamp) */
  version: v.optional(v.number()),

  /** Unique version identifier string */
  version_id: v.optional(v.string()),

  /** Signature for verifying the response authenticity */
  signature: v.optional(v.string()),

  /** ETag for cache validation */
  etag: v.optional(v.string()),

  // ============================================
  // METADATA FIELDS
  // ============================================

  /** ISO 8601 timestamp when the asset was created */
  created_at: v.optional(v.string()),

  /** Array of tags associated with the asset */
  tags: v.optional(v.array(v.string())),

  /** Folder path where the asset is stored */
  folder: v.optional(v.string()),

  /** Original filename without extension */
  original_filename: v.optional(v.string()),

  /** Original file extension before any format conversion */
  original_extension: v.optional(v.string()),

  /** Display name of the asset in Media Library */
  display_name: v.optional(v.string()),

  /** Asset folder path in the new folder structure */
  asset_folder: v.optional(v.string()),

  // ============================================
  // TYPE & ACCESS FIELDS
  // ============================================

  /** Resource type: "image", "video", "raw", or "auto" */
  resource_type: v.optional(v.string()),

  /** Delivery type: "upload", "private", "authenticated", etc. */
  type: v.optional(v.string()),

  /** Access mode: "public" or "authenticated" */
  access_mode: v.optional(v.string()),

  // ============================================
  // STATUS FLAGS
  // ============================================

  /** Whether this asset already existed (for unique_filename uploads) */
  existing: v.optional(v.boolean()),

  /** Whether a placeholder was returned instead of the actual asset */
  placeholder: v.optional(v.boolean()),

  /** Whether the asset is being processed asynchronously */
  done: v.optional(v.boolean()),

  // ============================================
  // API & SECURITY FIELDS
  // ============================================

  /** The API key used for this upload */
  api_key: v.optional(v.string()),

  /** Deletion token (if return_delete_token was set) */
  delete_token: v.optional(v.string()),

  // ============================================
  // EAGER TRANSFORMATIONS
  // ============================================

  /** Array of eager transformation results */
  eager: v.optional(
    v.array(
      v.object({
        transformation: v.optional(v.string()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        bytes: v.optional(v.number()),
        format: v.optional(v.string()),
        url: v.optional(v.string()),
        secure_url: v.optional(v.string()),
      })
    )
  ),

  // ============================================
  // ANALYSIS & ADD-ON FIELDS
  // ============================================

  /** Predominant colors detected in the image */
  colors: v.optional(v.array(v.array(v.any()))),

  /** Image moderation results */
  moderation: v.optional(v.array(v.any())),

  /** Phash for image similarity detection */
  phash: v.optional(v.string()),

  /** Quality analysis score */
  quality_analysis: v.optional(
    v.object({
      focus: v.optional(v.number()),
    })
  ),

  /** Accessibility analysis results */
  accessibility_analysis: v.optional(v.any()),

  /** Context metadata (alt text, caption, custom data) */
  context: v.optional(v.any()),

  /** Image metadata (EXIF, IPTC, XMP) */
  image_metadata: v.optional(v.any()),

  /** Media metadata */
  media_metadata: v.optional(v.any()),

  /** Faces detected in the image */
  faces: v.optional(v.array(v.array(v.number()))),

  /** Illustration score (0-100, how illustrated vs photographic) */
  illustration_score: v.optional(v.number()),

  /** Semi-transparent detection */
  semi_transparent: v.optional(v.boolean()),

  /** Grayscale detection */
  grayscale: v.optional(v.boolean()),

  // ============================================
  // ASYNC PROCESSING FIELDS
  // ============================================

  /** Batch ID for tracking async operations */
  batch_id: v.optional(v.string()),

  /** Status for async operations: "pending", "complete", "failed" */
  status: v.optional(v.string()),
});

/** TypeScript type for Cloudinary upload response */
export type CloudinaryUploadResult = Infer<typeof vCloudinaryUploadResponse>;

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
// Note: This validation is intentionally permissive to support all Cloudinary options
// Type-safety is enforced by TypeScript interfaces in apiUtils.ts
function validateTransformation(transformation: Record<string, unknown>): void {
  if (!transformation || typeof transformation !== "object") return;

  const {
    width,
    height,
    crop,
    quality,
    format,
    gravity,
    radius,
    opacity,
    zoom,
    dpr,
  } = transformation;

  // Dimension validation
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

  // Crop validation - accept all valid Cloudinary crop modes
  if (crop !== undefined) {
    if (typeof crop !== "string") {
      throw new Error("Crop must be a string");
    }
    const validCrops = [
      "crop",
      "fill",
      "fill_pad",
      "fit",
      "limit",
      "mfit",
      "pad",
      "lpad",
      "mpad",
      "scale",
      "thumb",
      "imagga_crop",
      "imagga_scale",
      "lfill",
      "auto",
      "auto_pad",
    ];
    if (!validCrops.includes(crop)) {
      throw new Error(
        `Invalid crop mode. Valid options: ${validCrops.join(", ")}`
      );
    }
  }

  // Quality validation - accept auto presets and numbers
  if (quality !== undefined) {
    if (typeof quality === "string") {
      // Accept "auto", "auto:best", "auto:good", "auto:eco", "auto:low", etc.
      if (!quality.startsWith("auto") && isNaN(Number(quality))) {
        throw new Error(
          "Quality must be 'auto', an auto variant (auto:best, auto:eco, etc.), or a number 1-100"
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

  // Format validation - accept all common image formats
  if (format !== undefined) {
    if (typeof format !== "string") {
      throw new Error("Format must be a string");
    }
    const validFormats = [
      "auto",
      "jpg",
      "jpeg",
      "png",
      "png8",
      "png24",
      "png32",
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

  // Gravity validation - accept compass, auto, face detection, and object detection
  if (gravity !== undefined) {
    if (typeof gravity !== "string") {
      throw new Error("Gravity must be a string");
    }
    // Accept standard gravity values and allow custom object detection values
    const standardGravities = [
      "auto",
      "auto:subject",
      "auto:classic",
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
      "eyes",
      "adv_face",
      "adv_faces",
      "adv_eyes",
      "liquid",
      "ocr_text",
      "custom",
    ];
    // Allow any value that starts with a standard gravity or is for object detection
    const isValid = standardGravities.some(
      (g) => gravity === g || gravity.startsWith(g + ":")
    );
    if (!isValid && !/^[a-z_:]+$/.test(gravity)) {
      throw new Error(`Invalid gravity value: ${gravity}`);
    }
  }

  // Radius validation
  if (radius !== undefined) {
    if (typeof radius === "number" && (radius < 0 || radius > 2000)) {
      throw new Error("Radius must be between 0 and 2000");
    } else if (
      typeof radius === "string" &&
      !/^(max|\d+:\d+:\d+:\d+)$/.test(radius)
    ) {
      throw new Error(
        'Radius string must be "max" or corner values like "20:30:40:50"'
      );
    }
  }

  // Opacity validation
  if (opacity !== undefined) {
    if (typeof opacity !== "number" || opacity < 0 || opacity > 100) {
      throw new Error("Opacity must be a number between 0 and 100");
    }
  }

  // Zoom validation
  if (zoom !== undefined) {
    if (typeof zoom !== "number" || zoom < 0) {
      throw new Error("Zoom must be a positive number");
    }
  }

  // DPR validation
  if (dpr !== undefined) {
    if (typeof dpr === "number" && (dpr < 0.5 || dpr > 4)) {
      throw new Error("DPR must be between 0.5 and 4");
    } else if (typeof dpr === "string" && dpr !== "auto") {
      throw new Error('DPR must be a number or "auto"');
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
    transformation: vTransformation,
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
  returns: v.array(vAsset),
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
  returns: v.union(vAsset, v.null()),
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
  returns: v.union(vAsset, v.null()),
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

/**
 * Upload a file to Cloudinary using base64 data.
 *
 * **Important:** This method has a 16MB argument size limit from Convex.
 * Since base64 encoding adds ~33% overhead, the practical limit is ~10-12MB.
 *
 * For larger files, use the two-part direct upload flow:
 * 1. `generateUploadCredentials` - get signed credentials
 * 2. Upload directly from browser to Cloudinary
 * 3. `finalizeUpload` - store metadata in database
 *
 * @see generateUploadCredentials for large file uploads
 */
export const upload = action({
  args: {
    base64Data: v.string(),
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    transformation: v.optional(vTransformation),
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

/**
 * Generate signed upload credentials for direct browser-to-Cloudinary uploads.
 *
 * This enables uploading large files (beyond Convex's 16MB limit) by:
 * 1. Generating secure, time-limited upload credentials server-side
 * 2. Client uploads directly to Cloudinary with these credentials
 * 3. Call `finalizeUpload` to store the asset metadata in Convex
 *
 * **Benefits:**
 * - No file size limit from Convex (Cloudinary limits apply)
 * - Real-time progress tracking in the browser
 * - Reduced server load and faster uploads
 *
 * @see finalizeUpload - call after successful direct upload to store metadata
 */
export const generateUploadCredentials = action({
  args: {
    filename: v.optional(v.string()),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    transformation: v.optional(vTransformation),
    publicId: v.optional(v.string()),
    userId: v.optional(v.string()),
    config: v.object({
      cloudName: v.string(),
      apiKey: v.string(),
      apiSecret: v.string(),
    }),
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
    try {
      // Validate Cloudinary credentials
      const config = validateConfig(args.config);
      validateCloudinaryConfig(
        config.cloudName,
        config.apiKey,
        config.apiSecret
      );

      // Validate upload options
      const uploadOptions: Record<string, unknown> = {};
      if (args.folder) uploadOptions.folder = args.folder;
      if (args.tags) uploadOptions.tags = args.tags;
      if (args.publicId) uploadOptions.publicId = args.publicId;
      validateUploadOptions(uploadOptions);

      if (args.transformation) {
        validateTransformation(args.transformation);
      }

      // Generate direct upload credentials
      const credentials = await generateDirectUploadCredentials(
        config.cloudName,
        config.apiKey,
        config.apiSecret,
        {
          folder: args.folder,
          tags: args.tags,
          transformation: args.transformation,
          publicId: args.publicId,
        }
      );

      return {
        uploadUrl: credentials.uploadUrl,
        uploadParams: credentials.uploadParams,
      };
    } catch (error) {
      console.error("Failed to generate upload credentials:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate upload credentials"
      );
    }
  },
});

/**
 * Finalize a direct upload by storing the asset metadata in the database.
 *
 * Call this after a successful direct upload to Cloudinary to:
 * - Store the asset metadata in Convex for querying
 * - Enable the asset to appear in `listAssets` and `getAsset` queries
 *
 * **Direct upload flow:**
 * 1. `generateUploadCredentials` - get signed credentials
 * 2. Upload file directly to Cloudinary from browser
 * 3. `finalizeUpload` - store metadata (this function)
 *
 * @param uploadResult - The response from Cloudinary's upload API
 */
export const finalizeUpload = mutation({
  args: {
    publicId: v.string(),
    /** Type-safe Cloudinary upload response based on official API documentation */
    uploadResult: vCloudinaryUploadResponse,
    userId: v.optional(v.string()),
    folder: v.optional(v.string()),
  },
  returns: v.id("assets"),
  handler: async (ctx, args): Promise<Id<"assets">> => {
    try {
      // Validate that the upload was successful and data is consistent
      if (args.uploadResult.public_id !== args.publicId) {
        throw new Error("Public ID mismatch between request and upload result");
      }

      // Store the upload metadata in database
      const assetId: Id<"assets"> = await ctx.runMutation(
        internal.lib.storeAsset,
        {
          publicId: args.uploadResult.public_id,
          cloudinaryUrl: args.uploadResult.url,
          secureUrl: args.uploadResult.secure_url,
          originalFilename: args.uploadResult.original_filename,
          format: args.uploadResult.format,
          width: args.uploadResult.width,
          height: args.uploadResult.height,
          bytes: args.uploadResult.bytes,
          tags: args.uploadResult.tags,
          folder: args.uploadResult.folder || args.folder,
          userId: args.userId,
        }
      );

      return assetId;
    } catch (error) {
      console.error("Failed to finalize upload:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to finalize upload"
      );
    }
  },
});
