import { mutationGeneric, queryGeneric, actionGeneric } from "convex/server";
import { v } from "convex/values";
import type { Mounts } from "../component/_generated/api.js";
import type {
  UseApi,
  RunMutationCtx,
  RunQueryCtx,
  RunActionCtx,
} from "./types.js";
import {
  uploadDirectToCloudinary,
  isLargeFile,
  validateFile,
  type UploadCredentials,
  type DirectUploadOptions,
  type UploadProgressCallback,
  type CloudinaryUploadResponse,
  type CloudinaryTransformation,
  type FileValidationOptions,
} from "./upload-utils.js";

// Re-export CloudinaryTransformation with client-friendly quality type
export interface ClientCloudinaryTransformation
  extends Omit<CloudinaryTransformation, "quality"> {
  quality?: string | number; // Allow both for client convenience, will be converted to string
}

// For backward compatibility, re-export as CloudinaryTransformation
export type { ClientCloudinaryTransformation as CloudinaryTransformation };

export interface CloudinaryAsset {
  publicId: string;
  cloudinaryUrl: string;
  secureUrl: string;
  originalFilename?: string;
  format: string;
  width?: number;
  height?: number;
  bytes?: number;
  transformations?: CloudinaryTransformation[];
  tags?: string[];
  folder?: string;
  metadata?: Record<string, unknown>;
  uploadedAt: number;
  updatedAt: number;
  userId?: string;
}

export interface UploadOptions {
  filename?: string;
  folder?: string;
  tags?: string[];
  transformation?: CloudinaryTransformation;
  publicId?: string;
  userId?: string;
}

export interface ListAssetsOptions {
  userId?: string;
  folder?: string;
  tags?: string[];
  limit?: number;
  orderBy?: "uploadedAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export type CloudinaryComponent = UseApi<Mounts>;

export class CloudinaryClient {
  public config: CloudinaryConfig;

  /**
   * Create a CloudinaryClient instance.
   *
   * @param component - The Cloudinary component reference from `components.cloudinary`
   * @param config - Optional configuration. If not provided, falls back to environment variables.
   *
   * @example
   * ```ts
   * // Using environment variables (recommended)
   * const cloudinary = new CloudinaryClient(components.cloudinary);
   *
   * // Or with explicit config
   * const cloudinary = new CloudinaryClient(components.cloudinary, {
   *   cloudName: "my-cloud",
   *   apiKey: "my-key",
   *   apiSecret: "my-secret",
   * });
   * ```
   */
  constructor(
    public component: CloudinaryComponent,
    config?: Partial<CloudinaryConfig>
  ) {
    this.config = {
      cloudName: config?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: config?.apiKey ?? process.env.CLOUDINARY_API_KEY!,
      apiSecret: config?.apiSecret ?? process.env.CLOUDINARY_API_SECRET!,
    };
  }

  /**
   * Factory method to create a configured Cloudinary client
   * Similar to how Resend works
   */
  static create(component: CloudinaryComponent, config: CloudinaryConfig) {
    return new CloudinaryClient(component, config);
  }

  /**
   * Upload a file to Cloudinary using base64 data through Convex.
   *
   * **When to use:**
   * - Small to medium files (under ~10MB recommended)
   * - Server-side uploads where you already have base64 data
   * - Simple use cases where progress tracking isn't needed
   *
   * **Limitations:**
   * - Subject to Convex's 16MB argument size limit
   * - Base64 encoding adds ~33% overhead, so effective max is ~10-12MB
   * - No real-time progress tracking
   *
   * **For large files**, use {@link uploadDirect} instead, which bypasses
   * Convex for the file transfer and uploads directly to Cloudinary.
   *
   * @param ctx - The Convex action context
   * @param base64Data - Base64-encoded file data (data URL format: "data:image/png;base64,...")
   * @param options - Optional upload configuration
   * @returns Upload result with publicId, secureUrl, dimensions, etc.
   *
   * @example
   * ```ts
   * // In a Convex action
   * const result = await cloudinary.upload(ctx, base64Data, {
   *   folder: "uploads",
   *   tags: ["profile-picture"],
   * });
   * ```
   */
  async upload(ctx: RunActionCtx, base64Data: string, options?: UploadOptions) {
    // Transform the options to match backend expectations
    const backendOptions = {
      ...options,
      transformation: options?.transformation
        ? {
            ...options.transformation,
            // Convert number quality to string for backend compatibility
            quality:
              options.transformation.quality !== undefined
                ? String(options.transformation.quality)
                : undefined,
          }
        : undefined,
    };

    return ctx.runAction(this.component.lib.upload, {
      base64Data,
      config: this.config,
      ...backendOptions,
    });
  }

  /**
   * Generate a transformed URL for an existing asset
   */
  async transform(
    ctx: RunQueryCtx,
    publicId: string,
    transformation: CloudinaryTransformation
  ) {
    // Transform the options to match backend expectations
    const backendTransformation = {
      ...transformation,
      // Convert number quality to string for backend compatibility
      quality:
        transformation.quality !== undefined
          ? String(transformation.quality)
          : undefined,
    };

    return ctx.runQuery(this.component.lib.transform, {
      publicId,
      transformation: backendTransformation,
      config: this.config,
    });
  }

  /**
   * Delete an asset from Cloudinary and the database using direct API calls
   */
  async delete(ctx: RunActionCtx, publicId: string) {
    return ctx.runAction(this.component.lib.deleteAsset, {
      publicId,
      config: this.config,
    });
  }

  /**
   * List assets with optional filtering
   */
  async list(ctx: RunQueryCtx, options?: ListAssetsOptions) {
    return ctx.runQuery(this.component.lib.listAssets, {
      config: this.config,
      ...options,
    });
  }

  /**
   * Get a single asset by public ID
   */
  async getAsset(ctx: RunQueryCtx, publicId: string) {
    return ctx.runQuery(this.component.lib.getAsset, {
      publicId,
      config: this.config,
    });
  }

  /**
   * Update asset metadata
   */
  async updateAsset(
    ctx: RunMutationCtx,
    publicId: string,
    updates: { tags?: string[]; metadata?: Record<string, unknown> }
  ) {
    return ctx.runMutation(this.component.lib.updateAsset, {
      publicId,
      ...updates,
    });
  }

  /**
   * Generate signed upload credentials for direct browser-to-Cloudinary uploads.
   *
   * This is the first step in a two-part direct upload flow:
   * 1. Call this method to get signed credentials (server-side, secure)
   * 2. Upload directly to Cloudinary from the browser using credentials
   * 3. Call `finalizeUpload` to store metadata in Convex
   *
   * **When to use:**
   * - Building custom upload UI with progress tracking
   * - Need full control over the upload process
   * - Want to implement chunked uploads
   *
   * **For most use cases**, prefer {@link uploadDirect} which handles all
   * three steps automatically.
   *
   * @param ctx - The Convex action context
   * @param options - Upload options (folder, tags, transformation, etc.)
   * @returns Signed credentials with uploadUrl and uploadParams
   *
   * @example
   * ```ts
   * // Step 1: Get credentials (in Convex action)
   * const credentials = await cloudinary.generateUploadCredentials(ctx, {
   *   folder: "uploads",
   * });
   *
   * // Step 2: Upload from browser (client-side)
   * const formData = new FormData();
   * formData.append("file", file);
   * Object.entries(credentials.uploadParams).forEach(([k, v]) => {
   *   formData.append(k, v);
   * });
   * const response = await fetch(credentials.uploadUrl, {
   *   method: "POST",
   *   body: formData,
   * });
   * ```
   */
  async generateUploadCredentials(
    ctx: RunActionCtx,
    options?: DirectUploadOptions
  ): Promise<UploadCredentials> {
    // Transform the options to match backend expectations
    const backendOptions = {
      ...options,
      transformation: options?.transformation
        ? {
            ...options.transformation,
            // Convert number quality to string for backend compatibility
            quality:
              options.transformation.quality !== undefined
                ? String(options.transformation.quality)
                : undefined,
          }
        : undefined,
    };

    const result = await ctx.runAction(
      this.component.lib.generateUploadCredentials,
      {
        config: this.config,
        ...backendOptions,
      }
    );

    return {
      uploadUrl: result.uploadUrl,
      uploadParams: result.uploadParams,
    };
  }

  /**
   * Upload a file directly to Cloudinary, bypassing Convex for the file transfer.
   *
   * This method avoids Convex's 16MB argument size limit by uploading directly
   * from the browser to Cloudinary using signed credentials.
   *
   * **When to use:**
   * - Large files (over 10MB)
   * - Need real-time upload progress tracking
   * - Any file size when progress feedback is important
   *
   * **How it works:**
   * 1. Gets signed upload credentials from Convex (secure, server-side)
   * 2. Uploads file directly from browser to Cloudinary
   * 3. Stores metadata in Convex database
   *
   * **Note:** This method requires a browser environment with File API support.
   * It will not work in Node.js or Convex server environments.
   *
   * @param ctx - The Convex action context
   * @param file - File object to upload (from input element or drag-drop)
   * @param options - Upload options including progress callback and validation
   * @returns Cloudinary upload response with public_id, secure_url, etc.
   *
   * @example
   * ```ts
   * // In a React component
   * const handleUpload = async (file: File) => {
   *   const result = await cloudinary.uploadDirect(ctx, file, {
   *     folder: "uploads",
   *     onProgress: (progress) => setUploadProgress(progress),
   *     validation: { maxSize: 50 * 1024 * 1024 }, // 50MB max
   *   });
   *   console.log("Uploaded:", result.secure_url);
   * };
   * ```
   *
   * @see {@link upload} for base64 uploads (smaller files, server-compatible)
   * @see {@link isLargeFile} to check if a file should use direct upload
   */
  async uploadDirect(
    ctx: RunActionCtx,
    file: File,
    options?: DirectUploadOptions & {
      onProgress?: UploadProgressCallback;
      validation?: FileValidationOptions;
    }
  ): Promise<CloudinaryUploadResponse> {
    try {
      // Validate file if options provided
      if (options?.validation) {
        await validateFile(file, options.validation);
      }

      // Compress file if options provided
      const uploadFile = file;

      // Step 1: Get upload credentials from backend
      const credentials = await this.generateUploadCredentials(ctx, {
        filename: options?.filename || file.name,
        folder: options?.folder,
        tags: options?.tags,
        transformation: options?.transformation,
        publicId: options?.publicId,
        userId: options?.userId,
      });

      // Step 2: Upload directly to Cloudinary
      const uploadResult = await uploadDirectToCloudinary(
        uploadFile,
        credentials,
        options?.onProgress
      );

      // Step 3: Store metadata in database
      await ctx.runMutation(this.component.lib.finalizeUpload, {
        publicId: uploadResult.public_id,
        uploadResult,
        userId: options?.userId,
        folder: options?.folder,
      });

      return uploadResult;
    } catch (error) {
      console.error("Direct upload failed:", error);
      throw error;
    }
  }

  /**
   * Convert a File object to a base64 data URL string.
   *
   * **When to use:**
   * - You need base64 data for the {@link upload} method
   * - Converting files for preview before upload
   * - Small to medium files only (under ~10MB recommended)
   *
   * **Note:** This method only works in browser environments with FileReader
   * support. For server-side uploads, you should already have the file data
   * in a suitable format.
   *
   * **For large files**, use {@link uploadDirect} instead, which doesn't
   * require base64 conversion.
   *
   * @param file - File object to convert
   * @returns Base64 data URL string (e.g., "data:image/png;base64,...")
   * @throws Error if called outside a browser environment
   *
   * @example
   * ```ts
   * const file = inputElement.files[0];
   *
   * // Check file size first
   * if (CloudinaryClient.isLargeFile(file)) {
   *   // Use direct upload for large files
   *   await cloudinary.uploadDirect(ctx, file, options);
   * } else {
   *   // Convert to base64 for small files
   *   const base64 = await CloudinaryClient.fileToBase64(file);
   *   await cloudinary.upload(ctx, base64, options);
   * }
   * ```
   */
  static async fileToBase64(file: File): Promise<string> {
    if (typeof FileReader === "undefined") {
      throw new Error(
        "fileToBase64 requires a browser environment with FileReader support. " +
          "For server-side usage, use upload() method with base64 data directly."
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if a file should use direct upload based on its size.
   *
   * Files larger than the threshold should use {@link uploadDirect} to avoid
   * Convex's 16MB argument size limit. The default threshold is 10MB, which
   * accounts for base64 encoding overhead (~33%).
   *
   * @param file - File object to check
   * @param threshold - Size threshold in bytes (default: 10MB = 10 * 1024 * 1024)
   * @returns true if file size exceeds the threshold
   *
   * @example
   * ```ts
   * const file = inputElement.files[0];
   *
   * if (CloudinaryClient.isLargeFile(file)) {
   *   // Use direct upload for large files
   *   await cloudinary.uploadDirect(ctx, file, options);
   * } else {
   *   // Use base64 upload for small files
   *   const base64 = await CloudinaryClient.fileToBase64(file);
   *   await cloudinary.upload(ctx, base64, options);
   * }
   *
   * // Custom threshold (5MB)
   * if (CloudinaryClient.isLargeFile(file, 5 * 1024 * 1024)) {
   *   // ...
   * }
   * ```
   */
  static isLargeFile(file: File, threshold?: number): boolean {
    return isLargeFile(file, threshold);
  }

  /**
   * Validate a file before upload based on size and type constraints.
   *
   * @param file - File object to validate
   * @param options - Validation options
   * @param options.maxSize - Maximum file size in bytes (default: 100MB)
   * @param options.allowedTypes - Array of allowed MIME types (default: common image types)
   * @throws Error if file fails validation
   *
   * @example
   * ```ts
   * try {
   *   await CloudinaryClient.validateFile(file, {
   *     maxSize: 50 * 1024 * 1024, // 50MB
   *     allowedTypes: ["image/jpeg", "image/png", "image/webp"],
   *   });
   *   // File is valid, proceed with upload
   * } catch (error) {
   *   // Show validation error to user
   *   console.error("Invalid file:", error.message);
   * }
   * ```
   */
  static async validateFile(
    file: File,
    options?: FileValidationOptions
  ): Promise<void> {
    return validateFile(file, options);
  }

  /**
   * For easy re-exporting.
   * Apps can do
   * ```ts
   * export const { upload, transform, deleteAsset, listAssets, getAsset } = cloudinary.api();
   * ```
   */
  api() {
    return {
      upload: actionGeneric({
        args: {
          base64Data: v.string(),
          filename: v.optional(v.string()),
          folder: v.optional(v.string()),
          tags: v.optional(v.array(v.string())),
          transformation: v.optional(vTransformation),
          publicId: v.optional(v.string()),
          userId: v.optional(v.string()),
        },
        returns: vUploadResult,
        handler: async (ctx, args) => {
          return await this.upload(ctx, args.base64Data, args);
        },
      }),
      transform: queryGeneric({
        args: {
          publicId: v.string(),
          transformation: vTransformation,
        },
        returns: vTransformResult,
        handler: async (ctx, args) => {
          return await this.transform(ctx, args.publicId, args.transformation);
        },
      }),
      deleteAsset: actionGeneric({
        args: { publicId: v.string() },
        returns: vDeleteResult,
        handler: async (ctx, args) => {
          return await this.delete(ctx, args.publicId);
        },
      }),
      listAssets: queryGeneric({
        args: {
          userId: v.optional(v.string()),
          folder: v.optional(v.string()),
          tags: v.optional(v.array(v.string())),
          limit: v.optional(v.number()),
          orderBy: v.optional(
            v.union(v.literal("uploadedAt"), v.literal("updatedAt"))
          ),
          order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
        },
        returns: v.array(vAssetResponse),
        handler: async (ctx, args) => {
          return await this.list(ctx, args);
        },
      }),
      getAsset: queryGeneric({
        args: { publicId: v.string() },
        returns: v.union(vAssetResponse, v.null()),
        handler: async (ctx, args) => {
          return await this.getAsset(ctx, args.publicId);
        },
      }),
      updateAsset: mutationGeneric({
        args: {
          publicId: v.string(),
          tags: v.optional(v.array(v.string())),
          metadata: v.optional(v.any()),
        },
        returns: v.union(vAssetResponse, v.null()),
        handler: async (ctx, args) => {
          return await this.updateAsset(ctx, args.publicId, {
            tags: args.tags,
            metadata: args.metadata,
          });
        },
      }),
    };
  }
}

// ============================================================================
// VALIDATORS FOR PUBLIC API
// ============================================================================

/**
 * Validator for Cloudinary upload API response.
 * Based on Cloudinary's official Upload API documentation.
 * @see https://cloudinary.com/documentation/image_upload_api_reference
 */
export const vCloudinaryUploadResponse = v.object({
  // Required fields
  public_id: v.string(),
  secure_url: v.string(),
  url: v.string(),
  format: v.string(),

  // Dimension & size fields
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  bytes: v.optional(v.number()),
  pages: v.optional(v.number()),

  // Identification fields
  asset_id: v.optional(v.string()),
  version: v.optional(v.number()),
  version_id: v.optional(v.string()),
  signature: v.optional(v.string()),
  etag: v.optional(v.string()),

  // Metadata fields
  created_at: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  folder: v.optional(v.string()),
  original_filename: v.optional(v.string()),
  original_extension: v.optional(v.string()),
  display_name: v.optional(v.string()),
  asset_folder: v.optional(v.string()),

  // Type & access fields
  resource_type: v.optional(v.string()),
  type: v.optional(v.string()),
  access_mode: v.optional(v.string()),

  // Status flags
  existing: v.optional(v.boolean()),
  placeholder: v.optional(v.boolean()),
  done: v.optional(v.boolean()),

  // API & security fields
  api_key: v.optional(v.string()),
  delete_token: v.optional(v.string()),

  // Eager transformations
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

  // Analysis fields
  colors: v.optional(v.array(v.array(v.any()))),
  moderation: v.optional(v.array(v.any())),
  phash: v.optional(v.string()),
  quality_analysis: v.optional(v.object({ focus: v.optional(v.number()) })),
  accessibility_analysis: v.optional(v.any()),
  context: v.optional(v.any()),
  image_metadata: v.optional(v.any()),
  media_metadata: v.optional(v.any()),
  faces: v.optional(v.array(v.array(v.number()))),
  illustration_score: v.optional(v.number()),
  semi_transparent: v.optional(v.boolean()),
  grayscale: v.optional(v.boolean()),

  // Async processing fields
  batch_id: v.optional(v.string()),
  status: v.optional(v.string()),
});

/**
 * Validator for transformation options.
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

/**
 * Validator for upload result.
 */
export const vUploadResult = v.object({
  success: v.boolean(),
  publicId: v.optional(v.string()),
  secureUrl: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  format: v.optional(v.string()),
  bytes: v.optional(v.number()),
  error: v.optional(v.string()),
});

/**
 * Validator for transform result.
 */
export const vTransformResult = v.object({
  transformedUrl: v.string(),
  secureUrl: v.string(),
});

/**
 * Validator for delete result.
 */
export const vDeleteResult = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
});

/**
 * Validator for asset response (when returned to external consumers).
 * IDs are serialized as strings when crossing component boundaries.
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

// ============================================================================
// FUNCTION CREATOR FOR APPS
// ============================================================================

/**
 * Create public API functions that apps can re-export to expose to React clients.
 *
 * **Important:** Components cannot be called directly from React. This function
 * creates wrapper functions that run in your app's environment and can be called
 * from React via `useQuery`, `useMutation`, and `useAction`.
 *
 * @param component - The Cloudinary component reference from `components.cloudinary`
 * @param config - Optional configuration. If not provided, falls back to environment variables.
 * @returns Object with all API functions ready to be exported
 *
 * @example
 * ```ts
 * // convex/cloudinary.ts
 * import { makeCloudinaryAPI } from "@imaxis/cloudinary-convex";
 * import { components } from "./_generated/api";
 *
 * // Using environment variables (recommended)
 * export const {
 *   upload,
 *   transform,
 *   deleteAsset,
 *   listAssets,
 *   getAsset,
 *   updateAsset,
 * } = makeCloudinaryAPI(components.cloudinary);
 *
 * // Or with explicit config
 * export const { upload, listAssets } = makeCloudinaryAPI(components.cloudinary, {
 *   cloudName: "my-cloud",
 *   apiKey: "my-key",
 *   apiSecret: "my-secret",
 * });
 * ```
 *
 * Then in React:
 * ```tsx
 * import { api } from "../convex/_generated/api";
 * import { useCloudinaryUpload } from "@imaxis/cloudinary-convex/react";
 *
 * function MyComponent() {
 *   const { upload, isUploading } = useCloudinaryUpload(api.cloudinary.upload);
 *   // ...
 * }
 * ```
 */
export function makeCloudinaryAPI(
  component: CloudinaryComponent,
  config?: Partial<CloudinaryConfig>
) {
  const resolvedConfig: CloudinaryConfig = {
    cloudName: config?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: config?.apiKey ?? process.env.CLOUDINARY_API_KEY!,
    apiSecret: config?.apiSecret ?? process.env.CLOUDINARY_API_SECRET!,
  };

  return {
    /**
     * Upload a file to Cloudinary using base64 data.
     */
    upload: actionGeneric({
      args: {
        base64Data: v.string(),
        filename: v.optional(v.string()),
        folder: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        transformation: v.optional(vTransformation),
        publicId: v.optional(v.string()),
        userId: v.optional(v.string()),
      },
      returns: vUploadResult,
      handler: async (ctx, args) => {
        const { base64Data, transformation, ...restArgs } = args;
        const backendTransformation = transformation
          ? {
              ...transformation,
              quality:
                transformation.quality !== undefined
                  ? String(transformation.quality)
                  : undefined,
            }
          : undefined;

        return ctx.runAction(component.lib.upload, {
          base64Data,
          config: resolvedConfig,
          transformation: backendTransformation,
          ...restArgs,
        });
      },
    }),

    /**
     * Generate a transformed URL for an existing asset.
     */
    transform: queryGeneric({
      args: {
        publicId: v.string(),
        transformation: vTransformation,
      },
      returns: vTransformResult,
      handler: async (ctx, args) => {
        const backendTransformation = {
          ...args.transformation,
          quality:
            args.transformation.quality !== undefined
              ? String(args.transformation.quality)
              : undefined,
        };

        return ctx.runQuery(component.lib.transform, {
          publicId: args.publicId,
          transformation: backendTransformation,
          config: resolvedConfig,
        });
      },
    }),

    /**
     * Delete an asset from Cloudinary and the database.
     */
    deleteAsset: actionGeneric({
      args: { publicId: v.string() },
      returns: vDeleteResult,
      handler: async (ctx, args) => {
        return ctx.runAction(component.lib.deleteAsset, {
          publicId: args.publicId,
          config: resolvedConfig,
        });
      },
    }),

    /**
     * List assets with optional filtering.
     */
    listAssets: queryGeneric({
      args: {
        userId: v.optional(v.string()),
        folder: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        limit: v.optional(v.number()),
        orderBy: v.optional(
          v.union(v.literal("uploadedAt"), v.literal("updatedAt"))
        ),
        order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
      },
      returns: v.array(vAssetResponse),
      handler: async (ctx, args) => {
        return ctx.runQuery(component.lib.listAssets, {
          config: resolvedConfig,
          ...args,
        });
      },
    }),

    /**
     * Get a single asset by public ID.
     */
    getAsset: queryGeneric({
      args: { publicId: v.string() },
      returns: v.union(vAssetResponse, v.null()),
      handler: async (ctx, args) => {
        return ctx.runQuery(component.lib.getAsset, {
          publicId: args.publicId,
          config: resolvedConfig,
        });
      },
    }),

    /**
     * Update asset metadata.
     */
    updateAsset: mutationGeneric({
      args: {
        publicId: v.string(),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
      },
      returns: v.union(vAssetResponse, v.null()),
      handler: async (ctx, args) => {
        return ctx.runMutation(component.lib.updateAsset, {
          publicId: args.publicId,
          tags: args.tags,
          metadata: args.metadata,
        });
      },
    }),

    /**
     * Generate signed upload credentials for direct browser-to-Cloudinary uploads.
     */
    generateUploadCredentials: actionGeneric({
      args: {
        filename: v.optional(v.string()),
        folder: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        transformation: v.optional(vTransformation),
        publicId: v.optional(v.string()),
        userId: v.optional(v.string()),
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
        const backendOptions = {
          ...args,
          transformation: args.transformation
            ? {
                ...args.transformation,
                quality:
                  args.transformation.quality !== undefined
                    ? String(args.transformation.quality)
                    : undefined,
              }
            : undefined,
        };

        return ctx.runAction(component.lib.generateUploadCredentials, {
          config: resolvedConfig,
          ...backendOptions,
        });
      },
    }),

    /**
     * Finalize a direct upload by storing the asset metadata in the database.
     */
    finalizeUpload: mutationGeneric({
      args: {
        publicId: v.string(),
        /** Type-safe Cloudinary upload response based on official API documentation */
        uploadResult: vCloudinaryUploadResponse,
        userId: v.optional(v.string()),
        folder: v.optional(v.string()),
      },
      returns: v.string(), // Returns asset ID as string
      handler: async (ctx, args) => {
        return ctx.runMutation(component.lib.finalizeUpload, {
          publicId: args.publicId,
          uploadResult: args.uploadResult,
          userId: args.userId,
          folder: args.folder,
        });
      },
    }),
  };
}
