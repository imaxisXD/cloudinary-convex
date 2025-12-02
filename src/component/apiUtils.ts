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

// ============================================
// TYPE-SAFE CLOUDINARY TRANSFORMATION OPTIONS
// ============================================

/**
 * Crop/Resize modes available in Cloudinary
 * @see https://cloudinary.com/documentation/transformation_reference#c_crop_resize
 */
export type CropMode =
  /** Extracts a region of specified dimensions from original image. Requires gravity or x/y coordinates. */
  | "crop"
  /** Scales and crops to fill the specified dimensions, keeping aspect ratio. Some parts may be cut. */
  | "fill"
  /** Like fill but with smart content-aware padding instead of cropping. */
  | "fill_pad"
  /** Resizes image to fit within dimensions while preserving aspect ratio. Image may be smaller. */
  | "fit"
  /** Like fit, but only scales down, never enlarges. */
  | "limit"
  /** Like fit, but only scales up, never shrinks. */
  | "mfit"
  /** Resizes to fill dimensions and pads with background color to preserve aspect ratio. */
  | "pad"
  /** Like pad, but only scales down, never enlarges. */
  | "lpad"
  /** Like pad, but only scales up, never shrinks. */
  | "mpad"
  /** Changes dimensions without preserving aspect ratio. May distort image. */
  | "scale"
  /** Generates thumbnail using face detection for focusing. Great for profile pics. */
  | "thumb"
  /** Uses Imagga's smart cropping algorithm. Requires Imagga add-on. */
  | "imagga_crop"
  /** Uses Imagga's smart scaling algorithm. Requires Imagga add-on. */
  | "imagga_scale"
  /** Fills with letterboxing if needed to preserve aspect ratio. */
  | "lfill"
  /** Automatic cropping based on content. */
  | "auto"
  /** Automatic cropping with smart padding. */
  | "auto_pad";

/**
 * Gravity options for positioning transformations
 * @see https://cloudinary.com/documentation/transformation_reference#g_gravity
 */
export type GravityOption =
  // Compass directions - specifies which part of the image to keep/focus on
  /** Center of the image */
  | "center"
  /** Top of the image */
  | "north"
  /** Bottom of the image */
  | "south"
  /** Right side of the image */
  | "east"
  /** Left side of the image */
  | "west"
  /** Top-right corner */
  | "north_east"
  /** Top-left corner */
  | "north_west"
  /** Bottom-right corner */
  | "south_east"
  /** Bottom-left corner */
  | "south_west"
  // Smart gravity options
  /** AI-powered automatic detection of most important content */
  | "auto"
  /** Focus on detected faces */
  | "face"
  /** Focus on multiple detected faces */
  | "faces"
  /** AI subject detection - focuses on main subject */
  | "auto:subject"
  /** AI classic mode - original auto-gravity algorithm */
  | "auto:classic"
  /** Focus on detected body */
  | "body"
  /** Focus on detected eyes */
  | "eyes"
  /** Uses OCR to focus on text content */
  | "ocr_text"
  /** Advanced face detection for better results */
  | "adv_face"
  /** Advanced detection for multiple faces */
  | "adv_faces"
  /** Advanced eyes detection */
  | "adv_eyes"
  /** Custom gravity using x/y coordinates */
  | "custom"
  /** Any custom gravity value (e.g., "cat", "dog", object detection) */
  | string;

/**
 * Quality options for image optimization
 * @see https://cloudinary.com/documentation/transformation_reference#q_quality
 */
export type QualityOption =
  /** Automatic quality optimization based on content */
  | "auto"
  /** Auto quality prioritizing smaller file size */
  | "auto:low"
  /** Auto quality with good balance */
  | "auto:eco"
  /** Auto quality prioritizing visual quality */
  | "auto:good"
  /** Auto quality with best visual quality */
  | "auto:best"
  /** JPEG XL quality */
  | "auto:jpegxl"
  /** Specific quality percentage (1-100) */
  | number
  /** Any custom quality string */
  | string;

/**
 * Output format options
 * @see https://cloudinary.com/documentation/transformation_reference#f_format
 */
export type FormatOption =
  /** Automatic format selection based on browser support (WebP, AVIF, etc.) */
  | "auto"
  /** JPEG format - great for photos */
  | "jpg"
  | "jpeg"
  /** PNG format - supports transparency */
  | "png"
  /** PNG 8-bit */
  | "png8"
  /** PNG 24-bit */
  | "png24"
  /** PNG 32-bit with alpha */
  | "png32"
  /** WebP format - modern format with good compression */
  | "webp"
  /** AVIF format - newest format with best compression */
  | "avif"
  /** GIF format - for animations */
  | "gif"
  /** BMP format */
  | "bmp"
  /** TIFF format - for high quality prints */
  | "tiff"
  /** ICO format - for favicons */
  | "ico"
  /** PDF format */
  | "pdf"
  /** SVG format - vector images */
  | "svg"
  /** Any custom format string */
  | string;

/**
 * Common effect options
 * @see https://cloudinary.com/documentation/transformation_reference#e_effect
 */
export type EffectOption =
  // Color adjustments
  /** Convert to grayscale */
  | "grayscale"
  /** Apply sepia tone (optionally with intensity: "sepia:80") */
  | "sepia"
  | `sepia:${number}`
  /** Convert to black and white */
  | "blackwhite"
  /** Negate/invert colors */
  | "negate"
  /** Colorize the image (use with "co_" color parameter) */
  | "colorize"
  | `colorize:${number}`
  // Blur effects
  /** Apply blur (optionally with strength: "blur:300") */
  | "blur"
  | `blur:${number}`
  /** Blur detected faces */
  | "blur_faces"
  | `blur_faces:${number}`
  /** Blur specific region */
  | "blur_region"
  // Artistic effects
  /** Apply oil painting effect */
  | "oil_paint"
  | `oil_paint:${number}`
  /** Apply cartoon effect */
  | "cartoonify"
  | `cartoonify:${number}`
  | `cartoonify:${number}:${number}`
  /** Apply vignette effect */
  | "vignette"
  | `vignette:${number}`
  /** Apply pixelation */
  | "pixelate"
  | `pixelate:${number}`
  /** Pixelate detected faces */
  | "pixelate_faces"
  | `pixelate_faces:${number}`
  // Enhancements
  /** Auto-enhance image quality */
  | "improve"
  | `improve:${number}`
  /** Auto brightness adjustment */
  | "auto_brightness"
  /** Auto color adjustment */
  | "auto_color"
  /** Auto contrast adjustment */
  | "auto_contrast"
  /** Sharpen image */
  | "sharpen"
  | `sharpen:${number}`
  /** Unsharp mask */
  | "unsharp_mask"
  | `unsharp_mask:${number}`
  /** Apply vibrance */
  | "vibrance"
  | `vibrance:${number}`
  /** Adjust saturation */
  | `saturation:${number}`
  /** Adjust brightness */
  | `brightness:${number}`
  /** Adjust contrast */
  | `contrast:${number}`
  /** Adjust gamma */
  | `gamma:${number}`
  /** Adjust hue */
  | `hue:${number}`
  // Special effects
  /** Add drop shadow */
  | "dropshadow"
  /** Add outline */
  | "outline"
  /** Apply gradient fade */
  | "gradient_fade"
  /** Simulate colorblindness */
  | "simulate_colorblind"
  /** Vectorize image */
  | "vectorize"
  /** Red-eye removal */
  | "redeye"
  /** Advanced red-eye removal */
  | "adv_redeye"
  // Generative AI effects (requires add-on)
  /** AI background removal */
  | "background_removal"
  /** AI generative fill */
  | "gen_fill"
  /** AI generative remove */
  | "gen_remove"
  /** AI generative replace */
  | "gen_replace"
  /** AI generative restore */
  | "gen_restore"
  /** AI generative recolor */
  | "gen_recolor"
  /** AI upscale */
  | "upscale"
  /** Any custom effect string */
  | string;

/**
 * Border radius options
 * @see https://cloudinary.com/documentation/transformation_reference#r_radius
 */
export type RadiusOption =
  /** Maximum radius (creates circle/ellipse) */
  | "max"
  /** Specific pixel value */
  | number
  /** Custom radius string (e.g., "20:30:40:50" for different corners) */
  | string;

/**
 * Comprehensive type-safe Cloudinary transformation options
 *
 * @example
 * // Basic resize
 * { width: 300, height: 200, crop: "fill" }
 *
 * @example
 * // Thumbnail with face detection
 * { width: 150, height: 150, crop: "thumb", gravity: "face" }
 *
 * @example
 * // Optimized delivery
 * { quality: "auto", format: "auto" }
 *
 * @example
 * // Artistic effect
 * { effect: "sepia:80", angle: 15 }
 *
 * @example
 * // Circular avatar
 * { width: 200, height: 200, crop: "fill", gravity: "face", radius: "max" }
 */
export interface CloudinaryTransformation {
  /**
   * Width of the output image in pixels
   * Can also use "auto" for responsive images
   */
  width?: number;

  /**
   * Height of the output image in pixels
   * Can also use "auto" for responsive images
   */
  height?: number;

  /**
   * Crop/resize mode that determines how the image is transformed
   * @see CropMode for all available options
   *
   * Common modes:
   * - "fill": Scale and crop to fill exact dimensions (may crop edges)
   * - "fit": Scale to fit within dimensions (maintains aspect ratio)
   * - "crop": Extract region (needs gravity or coordinates)
   * - "thumb": Generate thumbnail focusing on faces
   * - "scale": Resize without maintaining aspect ratio
   * - "pad": Resize and pad to exact dimensions
   */
  crop?: CropMode | string;

  /**
   * Image quality for compression (1-100 or quality preset)
   * @see QualityOption for all available options
   *
   * - "auto": Automatic optimization (recommended)
   * - "auto:best": Highest quality automatic
   * - "auto:eco": Balanced quality/size
   * - 80: Specific quality percentage
   */
  quality?: QualityOption;

  /**
   * Output format for the image
   * @see FormatOption for all available options
   *
   * - "auto": Automatic format based on browser (recommended)
   * - "webp": Modern format with good compression
   * - "avif": Newest format with best compression
   * - "jpg": Traditional format for photos
   * - "png": Format with transparency support
   */
  format?: FormatOption;

  /**
   * Gravity determines the focus point for cropping
   * @see GravityOption for all available options
   *
   * - "auto": AI-powered focus detection (recommended)
   * - "face"/"faces": Focus on detected faces
   * - "center", "north", "south_east", etc.: Compass directions
   * - "auto:subject": Focus on main subject
   */
  gravity?: GravityOption;

  /**
   * Border radius for rounded corners
   * @see RadiusOption for all available options
   *
   * - "max": Creates circle (if square) or ellipse
   * - 20: 20px border radius
   * - "20:30:40:50": Different radius per corner (TL:TR:BR:BL)
   */
  radius?: RadiusOption;

  /**
   * Overlay another image or text on top
   * Format: "publicId" or "text:fontFamily_fontSize:textContent"
   *
   * @example "logo" - Overlay image with public_id "logo"
   * @example "text:Arial_60:Hello" - Text overlay
   */
  overlay?: string;

  /**
   * Apply visual effects to the image
   * @see EffectOption for all available options
   *
   * - "grayscale": Convert to black and white
   * - "sepia:80": Vintage sepia tone
   * - "blur:300": Apply blur effect
   * - "cartoonify": Cartoon effect
   * - "improve": Auto-enhance quality
   * - "pixelate:10": Pixelation effect
   */
  effect?: EffectOption;

  /**
   * Rotation angle in degrees
   *
   * - Positive values: Clockwise rotation
   * - Negative values: Counter-clockwise rotation
   * - Special values: 90, 180, 270 for exact rotations
   * - "auto_right", "auto_left": Auto-rotate based on EXIF
   * - "vflip", "hflip": Vertical/horizontal flip
   */
  angle?: number | string;

  /**
   * X coordinate for positioning (used with crop or overlay)
   */
  x?: number;

  /**
   * Y coordinate for positioning (used with crop or overlay)
   */
  y?: number;

  /**
   * Opacity level (0-100) for overlays
   * 100 = fully opaque, 0 = fully transparent
   */
  opacity?: number;

  /**
   * Border to add around the image
   * Format: "width_style_color" e.g., "3px_solid_black"
   */
  border?: string;

  /**
   * Background color for padding or transparent areas
   * Accepts color names, hex codes, or "auto" for AI-selected color
   *
   * @example "white"
   * @example "rgb:FF0000"
   * @example "auto"
   */
  background?: string;

  /**
   * Color to use with effects like colorize, outline, etc.
   * Accepts color names, hex codes, or RGB values
   */
  color?: string;

  /**
   * Device pixel ratio for responsive images
   * Values: 1.0, 2.0, 3.0, "auto"
   */
  dpr?: number | string;

  /**
   * Aspect ratio to maintain when resizing
   * Format: "width:height" e.g., "16:9" or decimal like 1.5
   */
  aspectRatio?: string | number;

  /**
   * Zoom level for face/object detection crops
   * Values > 1 zoom in, < 1 zoom out
   */
  zoom?: number;

  /**
   * Default image to display if the requested image doesn't exist
   * Provide the public_id of the fallback image
   */
  defaultImage?: string;

  /**
   * Density/DPI for vector images and PDFs
   */
  density?: number;

  /**
   * Page number to extract from multi-page documents (PDFs)
   */
  page?: number;

  /**
   * Flags for additional transformation options
   * Common flags: "progressive", "lossy", "preserve_transparency"
   */
  flags?: string | string[];

  /**
   * Named transformation preset to apply
   * Create presets in Cloudinary console for reusable transformations
   */
  namedTransformation?: string;

  /**
   * Raw transformation string to append
   * Use for advanced transformations not covered by typed options
   */
  rawTransformation?: string;
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

/**
 * Transform a CloudinaryTransformation object to a Cloudinary URL parameter string
 * @param transformation - The transformation options
 * @returns Cloudinary URL transformation string (e.g., "w_300,h_200,c_fill,g_auto")
 *
 * @example
 * transformationToString({ width: 300, height: 200, crop: "fill", gravity: "auto" })
 * // Returns: "w_300,h_200,c_fill,g_auto"
 */
export function transformationToString(
  transformation: CloudinaryTransformation
): string {
  const parts: string[] = [];

  // Dimensions
  if (transformation.width) parts.push(`w_${transformation.width}`);
  if (transformation.height) parts.push(`h_${transformation.height}`);

  // Crop and positioning
  if (transformation.crop) parts.push(`c_${transformation.crop}`);
  if (transformation.gravity) parts.push(`g_${transformation.gravity}`);
  if (transformation.x !== undefined) parts.push(`x_${transformation.x}`);
  if (transformation.y !== undefined) parts.push(`y_${transformation.y}`);
  if (transformation.zoom !== undefined) parts.push(`z_${transformation.zoom}`);
  if (transformation.aspectRatio !== undefined)
    parts.push(`ar_${transformation.aspectRatio}`);

  // Quality and format
  if (transformation.quality) parts.push(`q_${transformation.quality}`);
  if (transformation.format) parts.push(`f_${transformation.format}`);
  if (transformation.dpr !== undefined) parts.push(`dpr_${transformation.dpr}`);

  // Visual modifications
  if (transformation.radius) parts.push(`r_${transformation.radius}`);
  if (transformation.angle !== undefined)
    parts.push(`a_${transformation.angle}`);
  if (transformation.effect) parts.push(`e_${transformation.effect}`);
  if (transformation.opacity !== undefined)
    parts.push(`o_${transformation.opacity}`);

  // Colors and backgrounds
  if (transformation.background) parts.push(`b_${transformation.background}`);
  if (transformation.color) parts.push(`co_${transformation.color}`);
  if (transformation.border) parts.push(`bo_${transformation.border}`);

  // Overlays
  if (transformation.overlay) parts.push(`l_${transformation.overlay}`);

  // Document handling
  if (transformation.density !== undefined)
    parts.push(`dn_${transformation.density}`);
  if (transformation.page !== undefined)
    parts.push(`pg_${transformation.page}`);

  // Default image
  if (transformation.defaultImage)
    parts.push(`d_${transformation.defaultImage}`);

  // Named transformation
  if (transformation.namedTransformation)
    parts.push(`t_${transformation.namedTransformation}`);

  // Flags
  if (transformation.flags) {
    const flagsArray = Array.isArray(transformation.flags)
      ? transformation.flags
      : [transformation.flags];
    flagsArray.forEach((flag) => parts.push(`fl_${flag}`));
  }

  // Raw transformation (append as-is)
  if (transformation.rawTransformation) {
    parts.push(transformation.rawTransformation);
  }

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

// Generate signature for direct client uploads (browser to Cloudinary)
export async function generateDirectUploadSignature(
  params: Record<string, unknown>,
  apiSecret: string
): Promise<{ signature: string; timestamp: number }> {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsWithTimestamp: Record<string, unknown> = { ...params, timestamp };

  // Remove signature if it exists (shouldn't, but just in case)
  const { signature: _, ...signatureParams } = paramsWithTimestamp as Record<
    string,
    unknown
  > & { signature?: unknown };

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

// Verify upload completion by checking if asset exists in Cloudinary
// Note: This function uses Basic Auth for simplicity; signature-based verification
// could be implemented in the future if needed.
export async function verifyUploadCompletion(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string,
  resourceType: string = "image"
): Promise<boolean> {
  try {
    // Using Basic Auth for admin API access
    const adminUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/${publicId}`;

    // Make API call to check if asset exists
    const response = await fetch(adminUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.warn("Failed to verify upload completion:", error);
    return false; // Assume upload exists if verification fails
  }
}

// Generate upload parameters for direct client upload
export interface DirectUploadCredentials {
  uploadUrl: string;
  uploadParams: {
    api_key: string;
    timestamp: string;
    signature: string;
    [key: string]: string;
  };
}

export async function generateDirectUploadCredentials(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  options: {
    folder?: string;
    tags?: string[];
    transformation?: CloudinaryTransformation;
    publicId?: string;
    resourceType?: string;
  } = {}
): Promise<DirectUploadCredentials> {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${options.resourceType || "image"}/upload`;

  // Build parameters for signature generation (EXCLUDE api_key)
  const paramsToSign: Record<string, unknown> = {};

  if (options.folder) paramsToSign.folder = options.folder;
  if (options.tags && options.tags.length > 0) {
    paramsToSign.tags = options.tags.join(",");
  }
  if (options.publicId) paramsToSign.public_id = options.publicId;
  if (options.transformation) {
    const transformationString = transformationToString(options.transformation);
    if (transformationString) {
      paramsToSign.transformation = transformationString;
    }
  }

  // Generate signature (without api_key)
  const { signature, timestamp } = await generateDirectUploadSignature(
    paramsToSign,
    apiSecret
  );

  // Build final upload parameters (INCLUDE api_key for the actual upload)
  const uploadParams: Record<string, unknown> = {
    api_key: apiKey,
    timestamp: timestamp.toString(),
    signature: signature,
  };

  // Add the other parameters to the upload params
  if (options.folder) uploadParams.folder = options.folder;
  if (options.tags && options.tags.length > 0) {
    uploadParams.tags = options.tags.join(",");
  }
  if (options.publicId) uploadParams.public_id = options.publicId;
  if (options.transformation) {
    const transformationString = transformationToString(options.transformation);
    if (transformationString) {
      uploadParams.transformation = transformationString;
    }
  }

  return {
    uploadUrl,
    uploadParams: uploadParams as DirectUploadCredentials["uploadParams"],
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
