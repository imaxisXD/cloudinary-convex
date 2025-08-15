/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { modules } from "./setup.test.js";

// Mock Cloudinary credentials
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'test-secret-key-123456789';

// Mock base64 image data (1x1 transparent PNG)
const mockImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Mock Cloudinary SDK
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn().mockResolvedValue({
        public_id: 'test-image-123',
        url: 'http://res.cloudinary.com/test-cloud/image/upload/test-image-123',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test-image-123',
        format: 'png',
        width: 1,
        height: 1,
        bytes: 95
      }),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

describe("Cloudinary component lib", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("should upload and store asset", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png',
      folder: 'test-uploads',
      tags: ['test']
    });
    
    expect(result.success).toBe(true);
    expect(result.publicId).toBe('test-image-123');
    expect(result.secureUrl).toContain('test-cloud');
  });

  test("should generate transformed URLs", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.query(api.lib.transform, {
      publicId: 'sample-image',
      transformation: {
        width: 300,
        height: 300,
        crop: 'fill'
      }
    });
    
    expect(result.transformedUrl).toContain('test-cloud');
    expect(result.transformedUrl).toContain('w_300,h_300,c_fill');
    expect(result.transformedUrl).toContain('sample-image');
  });

  test("should list assets with filtering", async () => {
    const t = convexTest(schema, modules);
    
    // First upload an asset
    await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png',
      folder: 'test-folder',
      tags: ['test-tag']
    });
    
    // Then list assets
    const result = await t.query(api.lib.listAssets, {
      folder: 'test-folder',
      limit: 10
    });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('publicId');
    expect(result[0]).toHaveProperty('secureUrl');
  });

  test("should get single asset", async () => {
    const t = convexTest(schema, modules);
    
    // Upload an asset first
    const uploadResult = await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png'
    });
    
    // Get the asset
    const asset = await t.query(api.lib.getAsset, {
      publicId: uploadResult.publicId!
    });
    
    expect(asset).not.toBeNull();
    expect(asset?.publicId).toBe(uploadResult.publicId);
  });

  test("should update asset metadata", async () => {
    const t = convexTest(schema, modules);
    
    // Upload an asset first
    const uploadResult = await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png'
    });
    
    // Update the asset
    const updatedAsset = await t.mutation(api.lib.updateAsset, {
      publicId: uploadResult.publicId!,
      tags: ['updated', 'test'],
      metadata: { category: 'test-images' }
    });
    
    expect(updatedAsset).not.toBeNull();
    expect(updatedAsset?.tags).toContain('updated');
    expect(updatedAsset?.metadata).toHaveProperty('category', 'test-images');
  });

  test("should delete asset", async () => {
    const t = convexTest(schema, modules);
    
    // Upload an asset first
    const uploadResult = await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png'
    });
    
    // Delete the asset
    const deleteResult = await t.action(api.lib.deleteAsset, {
      publicId: uploadResult.publicId!
    });
    
    expect(deleteResult.success).toBe(true);
    
    // Verify it's deleted from database
    const asset = await t.query(api.lib.getAsset, {
      publicId: uploadResult.publicId!
    });
    expect(asset).toBeNull();
  });

  test("should validate file data", async () => {
    const t = convexTest(schema, modules);
    
    // Test with invalid base64 data
    const result = await t.action(api.lib.upload, {
      base64Data: 'invalid-data',
      filename: 'test.png'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid file data format');
  });

  test("should validate transformation parameters", async () => {
    const t = convexTest(schema, modules);
    
    try {
      await t.query(api.lib.transform, {
        publicId: 'test-image',
        transformation: {
          width: -1,  // Invalid width
          height: 300,
          crop: 'fill'
        }
      });
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect((error as Error).message).toContain('Width must be between');
    }
  });
});
