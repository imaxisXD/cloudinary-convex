import { mutationGeneric, queryGeneric, actionGeneric } from "convex/server";
import { v } from "convex/values";
import type { Mounts } from "../component/_generated/api.js";
import type {
  UseApi,
  RunMutationCtx,
  RunQueryCtx,
  RunActionCtx,
} from "./types.js";

// Types for Cloudinary operations
export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
  gravity?: string;
  radius?: number | string;
  overlay?: string;
  effect?: string;
}

export interface CloudinaryAsset {
  publicId: string;
  cloudinaryUrl: string;
  secureUrl: string;
  originalFilename?: string;
  format: string;
  width?: number;
  height?: number;
  bytes?: number;
  transformations?: any[];
  tags?: string[];
  folder?: string;
  metadata?: any;
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
   * Upload a file to Cloudinary using direct API calls
   */
  async upload(ctx: RunActionCtx, base64Data: string, options?: UploadOptions) {
    return ctx.runAction(this.component.lib.upload, {
      base64Data,
      config: this.config,
      ...options,
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
    return ctx.runQuery(this.component.lib.transform, {
      publicId,
      transformation,
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
    updates: { tags?: string[]; metadata?: any }
  ) {
    return ctx.runMutation(this.component.lib.updateAsset, {
      publicId,
      ...updates,
    });
  }

  /**
   * Helper method to convert File to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
