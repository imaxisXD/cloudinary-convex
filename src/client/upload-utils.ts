// Client-side upload utilities for direct browser to Cloudinary uploads

import type {
  CloudinaryUploadResponse,
  CloudinaryTransformation,
} from "../component/apiUtils.js";

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

// Re-export types for convenience
export type { CloudinaryUploadResponse, CloudinaryTransformation };

export type UploadProgressCallback = (progress: number) => void;

export interface UploadError extends Error {
  status?: number;
  response?: string;
  retryable?: boolean;
}

// Configuration for upload retry logic
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Check if a file is considered "large" based on size threshold
 * @param file File to check
 * @param threshold Size threshold in bytes (default: 10MB)
 * @returns True if file size exceeds threshold
 */
export function isLargeFile(
  file: File,
  threshold: number = 10 * 1024 * 1024
): boolean {
  return file.size > threshold;
}

/**
 * Sleep for a specified amount of time
 * @param ms Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-based)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Check if an error is retryable
 * @param error Upload error
 * @returns True if the error should be retried
 */
function isRetryableError(error: UploadError): boolean {
  // Network errors are generally retryable
  if (!error.status) return true;

  // Server errors (5xx) are retryable
  if (error.status >= 500) return true;

  // Rate limiting (429) is retryable
  if (error.status === 429) return true;

  // Request timeout (408) is retryable
  if (error.status === 408) return true;

  // Client errors (4xx) are generally not retryable
  return false;
}

/**
 * Upload a file directly to Cloudinary using FormData and XMLHttpRequest
 * @param file File to upload
 * @param credentials Upload credentials from backend
 * @param onProgress Optional progress callback
 * @param retryConfig Optional retry configuration
 * @returns Promise resolving to Cloudinary upload response
 */
export async function uploadDirectToCloudinary(
  file: File,
  credentials: UploadCredentials,
  onProgress?: UploadProgressCallback,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<CloudinaryUploadResponse> {
  let lastError: UploadError | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await performUpload(file, credentials, onProgress);
    } catch (error) {
      lastError = error as UploadError;

      // Don't retry on the last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, retryConfig);
      console.warn(
        `Upload attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Upload failed with unknown error");
}

/**
 * Calculate appropriate timeout based on file size
 * Assumes minimum 100KB/s upload speed as worst case
 * @param fileSize File size in bytes
 * @returns Timeout in milliseconds
 */
function calculateTimeout(fileSize: number): number {
  // Base timeout of 60 seconds
  const baseTimeout = 60 * 1000;

  // Add 1 second per 100KB of file size (assumes ~100KB/s minimum upload speed)
  const sizeBasedTimeout = (fileSize / (100 * 1024)) * 1000;

  // Maximum timeout of 10 minutes for very large files
  const maxTimeout = 10 * 60 * 1000;

  return Math.min(baseTimeout + sizeBasedTimeout, maxTimeout);
}

/**
 * Perform the actual upload using XMLHttpRequest
 * @param file File to upload
 * @param credentials Upload credentials
 * @param onProgress Optional progress callback
 * @returns Promise resolving to Cloudinary response
 */
function performUpload(
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
      // Ensure all values are strings and not empty
      const stringValue = String(value);
      if (
        stringValue &&
        stringValue !== "undefined" &&
        stringValue !== "null"
      ) {
        formData.append(key, stringValue);
      }
    });

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    // Handle successful response
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result as CloudinaryUploadResponse);
        } catch {
          const error = new Error(
            "Invalid JSON response from Cloudinary"
          ) as UploadError;
          error.status = xhr.status;
          error.response = xhr.responseText;
          error.retryable = false;
          reject(error);
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;

        // Try to parse the error response for more details
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error && errorResponse.error.message) {
            errorMessage += ` - ${errorResponse.error.message}`;
          }
        } catch {
          // If we can't parse, include the raw response
          if (xhr.responseText) {
            errorMessage += ` - Response: ${xhr.responseText}`;
          }
        }

        const error = new Error(errorMessage) as UploadError;
        error.status = xhr.status;
        error.response = xhr.responseText;
        error.retryable = isRetryableError(error);
        reject(error);
      }
    });

    // Handle network errors
    xhr.addEventListener("error", () => {
      const error = new Error("Network error during upload") as UploadError;
      error.retryable = true;
      reject(error);
    });

    // Handle timeout
    xhr.addEventListener("timeout", () => {
      const error = new Error(
        `Upload timeout - file size: ${Math.round(file.size / (1024 * 1024))}MB. Try a faster connection or smaller file.`
      ) as UploadError;
      error.status = 408;
      error.retryable = true;
      reject(error);
    });

    // Handle upload cancellation
    xhr.addEventListener("abort", () => {
      const error = new Error("Upload cancelled") as UploadError;
      error.retryable = false;
      reject(error);
    });

    // Configure and start upload
    xhr.open("POST", credentials.uploadUrl);

    // Set dynamic timeout based on file size
    // Base: 60s + additional time based on file size (max 10 minutes)
    xhr.timeout = calculateTimeout(file.size);

    // Send the request
    xhr.send(formData);
  });
}

/**
 * Upload a file directly to Cloudinary using fetch API (simpler but less progress tracking)
 * @param file File to upload
 * @param credentials Upload credentials from backend
 * @param retryConfig Optional retry configuration
 * @returns Promise resolving to Cloudinary upload response
 */
export async function uploadDirectToCloudinaryFetch(
  file: File,
  credentials: UploadCredentials,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<CloudinaryUploadResponse> {
  let lastError: UploadError | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const formData = new FormData();

      // Add file
      formData.append("file", file);

      // Add all upload parameters
      Object.entries(credentials.uploadParams).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(credentials.uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        ) as UploadError;
        error.status = response.status;
        error.response = errorText;
        error.retryable = isRetryableError(error);
        throw error;
      }

      const result = await response.json();
      return result as CloudinaryUploadResponse;
    } catch (error) {
      lastError = error as UploadError;

      // Don't retry on the last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // For network errors without status, mark as retryable
      if (!lastError.status) {
        lastError.retryable = true;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, retryConfig);
      console.warn(
        `Upload attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Upload failed with unknown error");
}

/**
 * Validate a file before upload
 * @param file File to validate
 * @param options Validation options
 * @returns True if file is valid, throws error if not
 */
export interface FileValidationOptions {
  maxSize?: number; // Maximum file size in bytes
  allowedTypes?: string[]; // Allowed MIME types
}

export async function validateFile(
  file: File,
  options: FileValidationOptions = {}
): Promise<void> {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
    ],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(
      `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
    );
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Allowed types: ${allowedTypes.join(", ")}`
    );
  }
}
