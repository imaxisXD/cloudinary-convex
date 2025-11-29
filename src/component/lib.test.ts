/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { modules } from "./setup.test.js";

// Mock Cloudinary credentials (these are fake for testing)
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'test-secret-key-123456789';

// Mock config object for API calls
const mockConfig = {
  cloudName: 'test-cloud',
  apiKey: '123456789012345',
  apiSecret: 'test-secret-key-123456789',
};

// Mock base64 image data (1x1 transparent PNG)
const mockImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe("Cloudinary component lib", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Test transformation URL generation (doesn't require API calls)
  test("should generate transformed URLs", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.query(api.lib.transform, {
      publicId: 'sample-image',
      transformation: {
        width: 300,
        height: 300,
        crop: 'fill'
      },
      config: mockConfig,
    });
    
    expect(result.transformedUrl).toContain('test-cloud');
    expect(result.transformedUrl).toContain('w_300,h_300,c_fill');
    expect(result.transformedUrl).toContain('sample-image');
  });

  // Test file validation (doesn't require API calls)
  test("should validate file data format", async () => {
    const t = convexTest(schema, modules);
    
    // Test with invalid base64 data
    const result = await t.action(api.lib.upload, {
      base64Data: 'invalid-data',
      filename: 'test.png',
      config: mockConfig,
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid file data format');
  });

  // Test transformation parameter validation
  test("should validate transformation parameters", async () => {
    const t = convexTest(schema, modules);
    
    try {
      await t.query(api.lib.transform, {
        publicId: 'test-image',
        transformation: {
          width: -1,  // Invalid width
          height: 300,
          crop: 'fill'
        },
        config: mockConfig,
      });
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect((error as Error).message).toContain('Width must be between');
    }
  });

  // Test that transformation URL contains correct parameters
  test("should include all transformation parameters in URL", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.query(api.lib.transform, {
      publicId: 'my-image',
      transformation: {
        width: 500,
        height: 400,
        crop: 'thumb',
        quality: 'auto',
        format: 'webp',
        gravity: 'face',
      },
      config: mockConfig,
    });
    
    expect(result.transformedUrl).toContain('w_500');
    expect(result.transformedUrl).toContain('h_400');
    expect(result.transformedUrl).toContain('c_thumb');
    expect(result.transformedUrl).toContain('q_auto');
    expect(result.transformedUrl).toContain('f_webp');
    expect(result.transformedUrl).toContain('g_face');
  });

  // Test transformation with effects
  test("should handle effect transformations", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.query(api.lib.transform, {
      publicId: 'test-image',
      transformation: {
        effect: 'sepia',
      },
      config: mockConfig,
    });
    
    expect(result.transformedUrl).toContain('e_sepia');
  });

  // Test transformation with radius
  test("should handle radius transformation", async () => {
    const t = convexTest(schema, modules);
    
    const result = await t.query(api.lib.transform, {
      publicId: 'test-image',
      transformation: {
        width: 200,
        height: 200,
        crop: 'fill',
        radius: 20,
      },
      config: mockConfig,
    });
    
    expect(result.transformedUrl).toContain('r_20');
  });

  // Test width validation boundary
  test("should reject width above maximum", async () => {
    const t = convexTest(schema, modules);
    
    try {
      await t.query(api.lib.transform, {
        publicId: 'test-image',
        transformation: {
          width: 5000,  // Above max of 4000
          height: 300,
        },
        config: mockConfig,
      });
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect((error as Error).message).toContain('Width must be between');
    }
  });

  // Test height validation boundary
  test("should reject height above maximum", async () => {
    const t = convexTest(schema, modules);
    
    try {
      await t.query(api.lib.transform, {
        publicId: 'test-image',
        transformation: {
          width: 300,
          height: 5000,  // Above max of 4000
        },
        config: mockConfig,
      });
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect((error as Error).message).toContain('Height must be between');
    }
  });

  // Test valid base64 format is accepted (will fail at API but pass validation)
  test("should accept valid base64 format", async () => {
    const t = convexTest(schema, modules);
    
    // Valid base64 format should pass validation
    // It will fail at the Cloudinary API stage (mock credentials), but not at validation
    const result = await t.action(api.lib.upload, {
      base64Data: mockImageBase64,
      filename: 'test.png',
      config: mockConfig,
    });
    
    // The upload will fail due to mock credentials, but the error should NOT be about format
    if (!result.success && result.error) {
      expect(result.error).not.toContain('Invalid file data format');
    }
  });

  // Note: Integration tests that require real Cloudinary credentials are skipped.
  // These tests would need real credentials to run:
  // - should upload and store asset
  // - should list assets with filtering  
  // - should get single asset
  // - should update asset metadata
  // - should delete asset
  //
  // To run integration tests locally, set real CLOUDINARY_* environment variables
  // and create separate test files with `.integration.test.ts` suffix.
});
