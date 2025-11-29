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
  constructor(
    public component: CloudinaryComponent,
    public config: CloudinaryConfig
  ) {}

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
          transformation: v.optional(
            v.object({
              width: v.optional(v.number()),
              height: v.optional(v.number()),
              crop: v.optional(v.string()),
              quality: v.optional(v.string()),
              format: v.optional(v.string()),
              gravity: v.optional(v.string()),
              radius: v.optional(v.union(v.number(), v.string())),
              overlay: v.optional(v.string()),
              effect: v.optional(v.string()),
            })
          ),
          publicId: v.optional(v.string()),
          userId: v.optional(v.string()),
        },
        handler: async (ctx, args) => {
          return await this.upload(ctx, args.base64Data, args);
        },
      }),
      transform: queryGeneric({
        args: {
          publicId: v.string(),
          transformation: v.object({
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            crop: v.optional(v.string()),
            quality: v.optional(v.string()),
            format: v.optional(v.string()),
            gravity: v.optional(v.string()),
            radius: v.optional(v.union(v.number(), v.string())),
            overlay: v.optional(v.string()),
            effect: v.optional(v.string()),
          }),
        },
        handler: async (ctx, args) => {
          return await this.transform(ctx, args.publicId, args.transformation);
        },
      }),
      deleteAsset: actionGeneric({
        args: { publicId: v.string() },
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
        handler: async (ctx, args) => {
          return await this.list(ctx, args);
        },
      }),
      getAsset: queryGeneric({
        args: { publicId: v.string() },
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
