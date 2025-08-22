# Direct Upload Implementation Design

## Problem Statement

The current cloudinary-component implementation passes base64 data through Convex actions, which hits the 16MB argument size limit for large images. We need to implement a two-part upload system that allows direct browser-to-Cloudinary uploads while maintaining security and database consistency.

## Solution Overview

### Architecture: Hybrid Upload System

1. **Small Files (≤ 10MB)**: Continue using existing base64 approach for compatibility
2. **Large Files (> 10MB)**: Use direct upload approach

### Direct Upload Flow

```
Client                    Convex Backend              Cloudinary API
  │                            │                           │
  │ 1. Request upload credentials│                           │
  │ ──────────────────────────→ │                           │
  │                            │ 2. Generate signature     │
  │                            │    & upload parameters    │
  │ 3. Upload credentials      │                           │
  │ ←────────────────────────── │                           │
  │                            │                           │
  │ 4. Direct upload with file │                           │
  │ ──────────────────────────────────────────────────────→ │
  │                            │                           │
  │ 5. Upload response         │                           │
  │ ←────────────────────────────────────────────────────── │
  │                            │                           │
  │ 6. Store metadata in DB    │                           │
  │ ──────────────────────────→ │                           │
  │                            │                           │
```

## Implementation Components

### 1. Backend Components

#### New Actions in `lib.ts`:

```typescript
// Generate signed upload credentials
export const generateUploadCredentials = action({
  args: {
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
    uploadUrl: v.string(),
    uploadParams: v.object({
      api_key: v.string(),
      timestamp: v.string(),
      signature: v.string(),
      // Additional upload parameters
    }),
  }),
  handler: async (ctx, args) => {
    // Generate timestamp and signature
    // Return upload URL and signed parameters
  },
});

// Finalize upload and store metadata
export const finalizeUpload = mutation({
  args: {
    publicId: v.string(),
    uploadResult: v.object({
      public_id: v.string(),
      secure_url: v.string(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      format: v.string(),
      bytes: v.optional(v.number()),
      // ... other Cloudinary response fields
    }),
    userId: v.optional(v.string()),
  },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    // Store the upload metadata in database
    // Return the asset ID
  },
});
```

#### Enhanced `apiUtils.ts`:

```typescript
// Generate signature for direct uploads
export function generateDirectUploadSignature(
  params: Record<string, unknown>,
  apiSecret: string
): { signature: string; timestamp: number } {
  // Implementation similar to existing generateSignature
  // but optimized for direct uploads
}

// Verify upload completion (optional)
export async function verifyUploadCompletion(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string
): Promise<boolean> {
  // Make API call to Cloudinary to verify upload exists
}
```

### 2. Client Components

#### Enhanced `CloudinaryClient`:

```typescript
export class CloudinaryClient {
  // ... existing methods ...

  /**
   * Generate upload credentials for direct upload
   */
  async generateUploadCredentials(
    ctx: RunActionCtx,
    options?: DirectUploadOptions
  ) {
    return ctx.runAction(this.component.lib.generateUploadCredentials, {
      config: this.config,
      ...options,
    });
  }

  /**
   * Upload directly to Cloudinary (large files)
   */
  async uploadDirect(
    ctx: RunActionCtx,
    file: File,
    options?: DirectUploadOptions & { onProgress?: (progress: number) => void }
  ) {
    // 1. Get upload credentials
    const credentials = await this.generateUploadCredentials(ctx, options);

    // 2. Upload directly to Cloudinary
    const uploadResult = await uploadDirectToCloudinary(
      file,
      credentials,
      options?.onProgress
    );

    // 3. Store metadata in database
    await ctx.runMutation(this.component.lib.finalizeUpload, {
      publicId: uploadResult.public_id,
      uploadResult,
      userId: options?.userId,
    });

    return uploadResult;
  }

  /**
   * Smart upload that chooses method based on file size
   */
  async uploadSmart(
    ctx: RunActionCtx,
    file: File,
    options?: UploadOptions & { onProgress?: (progress: number) => void }
  ) {
    if (isLargeFile(file)) {
      return this.uploadDirect(ctx, file, options);
    } else {
      // Convert to base64 and use existing method
      const base64Data = await CloudinaryClient.fileToBase64(file);
      return this.upload(ctx, base64Data, options);
    }
  }
}
```

### 3. Client-Side Upload Utilities

#### New file: `client/upload-utils.ts`

```typescript
export interface UploadCredentials {
  uploadUrl: string;
  uploadParams: {
    api_key: string;
    timestamp: string;
    signature: string;
    [key: string]: string;
  };
}

export interface DirectUploadOptions {
  filename?: string;
  folder?: string;
  tags?: string[];
  transformation?: CloudinaryTransformation;
  publicId?: string;
  userId?: string;
}

export type UploadProgressCallback = (progress: number) => void;

export async function uploadDirectToCloudinary(
  file: File,
  credentials: UploadCredentials,
  onProgress?: UploadProgressCallback
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Add file
    formData.append("file", file);

    // Add all upload parameters
    Object.entries(credentials.uploadParams).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Track progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    // Handle response
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject(new Error("Invalid response from Cloudinary"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    // Start upload
    xhr.open("POST", credentials.uploadUrl);
    xhr.send(formData);
  });
}

export function isLargeFile(
  file: File,
  threshold: number = 10 * 1024 * 1024
): boolean {
  return file.size > threshold;
}
```

### 4. React Component Updates

#### Enhanced `useCloudinaryUpload` hook:

```typescript
export function useCloudinaryUpload(component: CloudinaryComponent) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const uploadSmart = useCallback(
    async (file: File, options?: DirectUploadOptions) => {
      try {
        setIsUploading(true);
        setProgress(0);
        setError(null);
        setResult(null);

        const cloudinary = new CloudinaryClient(component, {
          // Get from context or props
        });

        const uploadResult = await cloudinary.uploadSmart(
          ctx, // From useConvex context
          file,
          {
            ...options,
            onProgress: (progress) => setProgress(progress),
          }
        );

        setResult(uploadResult);
        return uploadResult;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [component]
  );

  return {
    uploadSmart,
    isUploading,
    progress,
    error,
    result,
    // ... existing methods
  };
}
```

## Security Considerations

1. **Signature Generation**: All signatures generated server-side using API secret
2. **Time-bound Uploads**: Signatures include timestamp and expire quickly
3. **Upload Constraints**: Server-side validation of upload parameters
4. **Database Verification**: Final upload stored only after successful Cloudinary response

## Migration Strategy

1. **Phase 1**: Implement new direct upload methods alongside existing base64 methods
2. **Phase 2**: Update example application to demonstrate both approaches
3. **Phase 3**: Deprecate base64-only methods in favor of smart upload methods
4. **Phase 4**: Add comprehensive testing and error handling

## Performance Benefits

- **Reduced Server Load**: Large files bypass Convex entirely for upload
- **Better User Experience**: Real progress tracking for large uploads
- **Improved Reliability**: Direct connection reduces points of failure
- **Cost Optimization**: Reduced Convex function execution time and memory usage

## Limitations & Considerations

1. **Browser Compatibility**: Requires modern browsers with XMLHttpRequest Level 2
2. **CORS Configuration**: May require Cloudinary CORS settings for some domains
3. **Error Handling**: More complex error scenarios to handle
4. **Fallback Strategy**: Need chunked upload through Convex for edge cases
5. **Server Environment Compatibility**: FileReader API not available in Convex server environments

## Server Environment Handling

### Problem: FileReader Not Available in Convex

The original implementation used `FileReader` to convert File objects to base64 and switch between upload methods, but this API is only available in browser environments. When called from Convex actions/functions, it results in:

```
Uncaught ReferenceError: FileReader is not defined
```

### Solution: Separate Upload Methods

We've simplified the approach with two distinct upload methods for different use cases:

#### 1. Base64 Upload (Server-Compatible)

- `upload(base64Data: string)` - Upload using base64 data through Convex
- Works in all environments (browser and server)
- Best for small to medium files (under 10-16MB due to Convex limits)
- Simple and reliable

#### 2. Direct Upload (Browser-Only)

- `uploadDirect(file: File)` - Upload directly to Cloudinary bypassing Convex
- Requires browser environment with File API
- Best for large files (over 10MB)
- Includes progress tracking and retry logic

#### 3. Usage Patterns

**For Small Files (Base64 Upload):**

```typescript
// In Convex actions - server-side
export const serverUpload = action({
  args: { base64Data: v.string() },
  handler: async (ctx, args) => {
    const cloudinary = new CloudinaryClient(component, config);

    // Simple base64 upload through Convex
    const result = await cloudinary.upload(ctx, args.base64Data, {
      folder: "uploads",
      tags: ["server-upload"],
    });

    return result;
  },
});

// In React components - client-side
const file = fileInput.files[0];
const base64 = await CloudinaryClient.fileToBase64(file);
const result = await cloudinary.upload(ctx, base64, options);
```

**For Large Files (Direct Upload):**

```typescript
// In React components - client-side only
const file = fileInput.files[0];

// Check if file is large
if (CloudinaryClient.isLargeFile(file, 10 * 1024 * 1024)) {
  // Use direct upload for large files
  const result = await cloudinary.uploadDirect(ctx, file, {
    onProgress: (progress) => setProgress(progress),
    validation: { maxSize: 100 * 1024 * 1024 }, // 100MB
  });
} else {
  // Use base64 upload for small files
  const base64 = await CloudinaryClient.fileToBase64(file);
  const result = await cloudinary.upload(ctx, base64, options);
}
```

#### 4. Environment Detection

The `fileToBase64()` method includes environment detection and provides clear error messages when used in incompatible environments.

## Next Steps

1. Implement signature generation in `apiUtils.ts`
2. Add new actions to `lib.ts`
3. Enhance `CloudinaryClient` with direct upload methods
4. Create client-side upload utilities
5. Update React hooks and components
6. Add comprehensive testing
7. Update documentation and examples
