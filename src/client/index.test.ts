import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CloudinaryClient } from "./index.js";
import type { DataModelFromSchemaDefinition } from "convex/server";
import {
  anyApi,
  queryGeneric,
  mutationGeneric,
  actionGeneric,
} from "convex/server";
import type {
  ApiFromModules,
  ActionBuilder,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";
import { components, initConvexTest } from "./setup.test.js";

// The schema for the tests
const schema = defineSchema({});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
const query = queryGeneric as QueryBuilder<DataModel, "public">;
const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
const action = actionGeneric as ActionBuilder<DataModel, "public">;

const cloudinaryClient = new CloudinaryClient(components.cloudinary, {});

// Mock base64 image data
const mockImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const testTransformQuery = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    return await cloudinaryClient.transform(ctx, args.publicId, {
      width: 100,
      height: 100,
      crop: 'fill'
    });
  },
});

export const testListQuery = query({
  args: {},
  handler: async (ctx, _args) => {
    return await cloudinaryClient.list(ctx, { limit: 10 });
  },
});

export const testUploadAction = action({
  args: { base64Data: v.string() },
  handler: async (ctx, args) => {
    return await cloudinaryClient.upload(ctx, args.base64Data, {
      folder: 'test-uploads',
      tags: ['test']
    });
  },
});

const testApi: ApiFromModules<{
  fns: {
    testTransformQuery: typeof testTransformQuery;
    testListQuery: typeof testListQuery;
    testUploadAction: typeof testUploadAction;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}>['fns'] = anyApi['index.test'] as any;

describe("CloudinaryClient", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("should create CloudinaryClient instance", () => {
    const client = new CloudinaryClient(components.cloudinary);
    expect(client).toBeDefined();
    expect(client.component).toBeDefined();
  });

  test.skip("should provide fileToBase64 helper (browser only)", () => {
    // This test requires browser APIs (FileReader, File) which are not available in Node.js
    // In a real browser environment, this method would work correctly
    expect(CloudinaryClient.fileToBase64).toBeDefined();
  });

  test("should generate transform URLs", async () => {
    const t = initConvexTest(schema);
    // Mock environment variables
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud');
    
    await t.run(async (ctx) => {
      const result = await cloudinaryClient.transform(ctx, 'sample-image', {
        width: 300,
        height: 300,
        crop: 'fill'
      });
      
      expect(result.transformedUrl).toContain('test-cloud');
      expect(result.transformedUrl).toContain('w_300,h_300,c_fill');
      expect(result.transformedUrl).toContain('sample-image');
    });
  });

  test("should list assets", async () => {
    const t = initConvexTest(schema);
    await t.run(async (ctx) => {
      const result = await cloudinaryClient.list(ctx, { limit: 5 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test("should provide API methods", () => {
    const client = new CloudinaryClient(components.cloudinary);
    const api = client.api();
    
    expect(api.upload).toBeDefined();
    expect(api.transform).toBeDefined();
    expect(api.deleteAsset).toBeDefined();
    expect(api.listAssets).toBeDefined();
    expect(api.getAsset).toBeDefined();
    expect(api.updateAsset).toBeDefined();
  });

  // Test validation scenarios
  test("should validate transformation parameters", async () => {
    const t = initConvexTest(schema);
    
    await t.run(async (ctx) => {
      // Test with invalid dimensions
      try {
        await cloudinaryClient.transform(ctx, 'test-image', {
          width: -1,  // Invalid width
          height: 300,
          crop: 'fill'
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect((error as Error).message).toContain('Width must be between');
      }
    });
  });
});
