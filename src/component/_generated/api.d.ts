/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiUtils from "../apiUtils.js";
import type * as lib from "../lib.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  apiUtils: typeof apiUtils;
  lib: typeof lib;
}>;
export type Mounts = {
  lib: {
    deleteAsset: FunctionReference<
      "action",
      "public",
      { publicId: string },
      { error?: string; success: boolean }
    >;
    getAsset: FunctionReference<
      "query",
      "public",
      { publicId: string },
      {
        bytes?: number;
        cloudinaryUrl: string;
        folder?: string;
        format: string;
        height?: number;
        metadata?: any;
        originalFilename?: string;
        publicId: string;
        secureUrl: string;
        tags?: Array<string>;
        transformations?: Array<any>;
        updatedAt: number;
        uploadedAt: number;
        userId?: string;
        width?: number;
      } | null
    >;
    listAssets: FunctionReference<
      "query",
      "public",
      {
        folder?: string;
        limit?: number;
        order?: "asc" | "desc";
        orderBy?: "uploadedAt" | "updatedAt";
        tags?: Array<string>;
        userId?: string;
      },
      Array<{
        bytes?: number;
        cloudinaryUrl: string;
        folder?: string;
        format: string;
        height?: number;
        metadata?: any;
        originalFilename?: string;
        publicId: string;
        secureUrl: string;
        tags?: Array<string>;
        transformations?: Array<any>;
        updatedAt: number;
        uploadedAt: number;
        userId?: string;
        width?: number;
      }>
    >;
    transform: FunctionReference<
      "query",
      "public",
      {
        publicId: string;
        transformation: {
          crop?: string;
          effect?: string;
          format?: string;
          gravity?: string;
          height?: number;
          overlay?: string;
          quality?: string;
          radius?: number | string;
          width?: number;
        };
      },
      { secureUrl: string; transformedUrl: string }
    >;
    updateAsset: FunctionReference<
      "mutation",
      "public",
      { metadata?: any; publicId: string; tags?: Array<string> },
      {
        bytes?: number;
        cloudinaryUrl: string;
        folder?: string;
        format: string;
        height?: number;
        metadata?: any;
        originalFilename?: string;
        publicId: string;
        secureUrl: string;
        tags?: Array<string>;
        transformations?: Array<any>;
        updatedAt: number;
        uploadedAt: number;
        userId?: string;
        width?: number;
      } | null
    >;
    upload: FunctionReference<
      "action",
      "public",
      {
        base64Data: string;
        filename?: string;
        folder?: string;
        publicId?: string;
        tags?: Array<string>;
        transformation?: {
          crop?: string;
          effect?: string;
          format?: string;
          gravity?: string;
          height?: number;
          overlay?: string;
          quality?: string;
          radius?: number | string;
          width?: number;
        };
        userId?: string;
      },
      {
        bytes?: number;
        error?: string;
        format?: string;
        height?: number;
        publicId?: string;
        secureUrl?: string;
        success: boolean;
        width?: number;
      }
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
