// Cloudinary API types
export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename?: string;
  eager?: Array<{
    transformation: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
    url: string;
    secure_url: string;
  }>;
}

export interface CloudinaryDeleteResponse {
  result: string;
}

export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  gravity?: string;
  radius?: number | string;
  overlay?: string;
  effect?: string;
}

export interface CloudinaryUploadOptions {
  filename?: string;
  folder?: string;
  tags?: string[];
  transformation?: CloudinaryTransformation;
  publicId?: string;
  userId?: string;
  eager?: CloudinaryTransformation[];
}

// Generate authentication signature for Cloudinary API
export async function generateSignature(
  params: Record<string, unknown>,
  apiSecret: string
): Promise<{ signature: string; timestamp: number }> {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsWithTimestamp: Record<string, unknown> = { ...params, timestamp };

  // Remove signature and file from params for signature generation
  const {
    signature: _,
    file: __,
    ...signatureParams
  } = paramsWithTimestamp as Record<string, unknown> & {
    signature?: unknown;
    file?: unknown;
  };

  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(signatureParams)
    .sort()
    .map((key) => `${key}=${signatureParams[key]}`)
    .join("&");

  // Create signature using SHA-1
  const signatureString = `${sortedParams}${apiSecret}`;
  const signature = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(signatureString)
  );
  const hashArray = new Uint8Array(signature);
  const signatureResult = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { signature: signatureResult, timestamp };
}

// Transform transformation object to Cloudinary parameter string
export function transformationToString(
  transformation: CloudinaryTransformation
): string {
  const parts: string[] = [];

  if (transformation.width) parts.push(`w_${transformation.width}`);
  if (transformation.height) parts.push(`h_${transformation.height}`);
  if (transformation.crop) parts.push(`c_${transformation.crop}`);
  if (transformation.quality) parts.push(`q_${transformation.quality}`);
  if (transformation.format) parts.push(`f_${transformation.format}`);
  if (transformation.gravity) parts.push(`g_${transformation.gravity}`);
  if (transformation.radius) parts.push(`r_${transformation.radius}`);
  if (transformation.overlay) parts.push(`l_${transformation.overlay}`);
  if (transformation.effect) parts.push(`e_${transformation.effect}`);

  return parts.join(",");
}

// Convert eager transformations array to string
export function eagerToString(eager: CloudinaryTransformation[]): string {
  return eager.map(transformationToString).join("|");
}

// Upload file to Cloudinary using REST API
export async function uploadToCloudinary(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  base64Data: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResponse> {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // Prepare upload parameters
  const uploadParams: Record<string, unknown> = {};

  if (options.publicId) uploadParams.public_id = options.publicId;
  if (options.folder) uploadParams.folder = options.folder;
  if (options.tags && options.tags.length > 0) {
    uploadParams.tags = options.tags.join(",");
  }
  if (options.transformation) {
    uploadParams.transformation = transformationToString(
      options.transformation
    );
  }
  if (options.eager && options.eager.length > 0) {
    uploadParams.eager = eagerToString(options.eager);
  }

  // Generate signature
  const { signature, timestamp } = await generateSignature(
    uploadParams,
    apiSecret
  );

  // Create form data
  const formData = new FormData();
  formData.append("file", base64Data);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);

  // Add other parameters
  Object.entries(uploadParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Make the API call
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Cloudinary upload failed: ${response.status} - ${errorData}`
    );
  }

  return (await response.json()) as CloudinaryUploadResponse;
}

// Delete asset from Cloudinary using REST API
export async function deleteFromCloudinary(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string,
  resourceType: string = "image"
): Promise<CloudinaryDeleteResponse> {
  const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;

  // Prepare delete parameters
  const deleteParams = { public_id: publicId };

  // Generate signature
  const { signature, timestamp } = await generateSignature(
    deleteParams,
    apiSecret
  );

  // Create form data
  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);

  // Make the API call
  const response = await fetch(deleteUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Cloudinary delete failed: ${response.status} - ${errorData}`
    );
  }

  return (await response.json()) as CloudinaryDeleteResponse;
}

// Generate transformation URL
export function generateTransformationUrl(
  cloudName: string,
  publicId: string,
  transformation: CloudinaryTransformation,
  resourceType: string = "image"
): { transformedUrl: string; secureUrl: string } {
  const transformationString = transformationToString(transformation);
  const baseUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload`;

  const url = transformationString
    ? `${baseUrl}/${transformationString}/${publicId}`
    : `${baseUrl}/${publicId}`;

  return {
    transformedUrl: url,
    secureUrl: url,
  };
}

// Validate environment variables
export function validateCloudinaryConfig(
  cloudName?: string,
  apiKey?: string,
  apiSecret?: string
): { cloudName: string; apiKey: string; apiSecret: string } {
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME environment variable is required");
  }
  if (!apiKey) {
    throw new Error("CLOUDINARY_API_KEY environment variable is required");
  }
  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET environment variable is required");
  }

  return { cloudName, apiKey, apiSecret };
}
