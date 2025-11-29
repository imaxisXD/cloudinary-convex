import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { CloudinaryClient } from "../../src/client/index.js";
import {
  uploadDirectToCloudinary,
  isLargeFile,
  type UploadCredentials,
} from "../../src/client/upload-utils.js";
import { components } from "../convex/_generated/api.js";

type CloudinaryImage = {
  _creationTime: number;
  _id: string;
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
};

// Comprehensive transformation options interface
interface TransformationOptions {
  // Basic transformations
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  quality?: string | number;
  format?: string;

  // Effects and enhancements
  effect?: string;
  radius?: number | string;
  overlay?: string;
  underlay?: string;

  // Color and artistic effects
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  gamma?: number;

  // Filters and artistic effects
  filter?: string;
  art?: string;
  cartoonify?: number;
  oilPaint?: number;
  sketch?: string;

  // Text and overlays
  text?: string;
  textColor?: string;
  textSize?: number;
  textFont?: string;

  // Advanced transformations
  angle?: number;
  flip?: string;
  rotation?: number;
  zoom?: number;

  // AI-powered transformations
  background?: string;
  removeBackground?: boolean;
  generateBackground?: string;

  // Responsive and optimization
  responsive?: boolean;
  auto?: string;
  fetchFormat?: string;
}

// Preset categories for organized display
type PresetCategory =
  | "resize"
  | "shape"
  | "color"
  | "artistic"
  | "adjustments"
  | "blur"
  | "transform";

interface PresetDefinition {
  name: string;
  settings: Partial<TransformationOptions>;
  category: PresetCategory;
  description?: string;
  exclusive?: string; // Group name for mutually exclusive effects
}

// Define all presets with categories and compatibility info
const PRESET_DEFINITIONS: PresetDefinition[] = [
  // Resize & Crop
  {
    name: "Basic Resize",
    settings: { width: 300, height: 300, crop: "fill" },
    category: "resize",
    description: "300x300 fill",
  },
  {
    name: "Square Thumbnail",
    settings: { width: 150, height: 150, crop: "thumb", gravity: "face" },
    category: "resize",
    description: "150x150 face-focused",
  },
  {
    name: "Landscape",
    settings: { width: 800, height: 400, crop: "fill" },
    category: "resize",
    description: "800x400",
  },
  {
    name: "Portrait",
    settings: { width: 400, height: 600, crop: "fill" },
    category: "resize",
    description: "400x600",
  },

  // Shape
  {
    name: "Circle",
    settings: { width: 200, height: 200, crop: "fill", radius: "max" },
    category: "shape",
    description: "Circular crop",
  },
  {
    name: "Rounded Corners",
    settings: { width: 300, height: 300, crop: "fill", radius: 20 },
    category: "shape",
    description: "20px radius",
  },

  // Color Effects (can combine with each other)
  {
    name: "Black & White",
    settings: { effect: "blackwhite" },
    category: "color",
    description: "Monochrome",
    exclusive: "color-effect",
  },
  {
    name: "Sepia",
    settings: { effect: "sepia" },
    category: "color",
    description: "Vintage brown",
    exclusive: "color-effect",
  },
  {
    name: "Grayscale",
    settings: { effect: "grayscale" },
    category: "color",
    description: "Gray tones",
    exclusive: "color-effect",
  },
  {
    name: "Invert",
    settings: { effect: "negate" },
    category: "color",
    description: "Negative colors",
    exclusive: "color-effect",
  },

  // Artistic Filters (mutually exclusive - only one art: effect at a time)
  {
    name: "Vintage (Audrey)",
    settings: { effect: "art:audrey" },
    category: "artistic",
    description: "Classic film look",
    exclusive: "artistic-filter",
  },
  {
    name: "Zorro",
    settings: { effect: "art:zorro" },
    category: "artistic",
    description: "High contrast",
    exclusive: "artistic-filter",
  },
  {
    name: "Aurora",
    settings: { effect: "art:aurora" },
    category: "artistic",
    description: "Ethereal glow",
    exclusive: "artistic-filter",
  },
  {
    name: "Oil Painting",
    settings: { effect: "oil_paint:6" },
    category: "artistic",
    description: "Painted effect",
    exclusive: "artistic-filter",
  },
  {
    name: "Sketch",
    settings: { effect: "sketch" },
    category: "artistic",
    description: "Pencil drawing",
    exclusive: "artistic-filter",
  },
  {
    name: "Cartoon",
    settings: { effect: "cartoonify:70" },
    category: "artistic",
    description: "Cartoon style",
    exclusive: "artistic-filter",
  },

  // Adjustments (can stack)
  {
    name: "Brightness +20",
    settings: { brightness: 20 },
    category: "adjustments",
    description: "Lighten",
  },
  {
    name: "Contrast +20",
    settings: { contrast: 20 },
    category: "adjustments",
    description: "More contrast",
  },
  {
    name: "Saturation -50",
    settings: { saturation: -50 },
    category: "adjustments",
    description: "Desaturate",
  },
  {
    name: "High Contrast",
    settings: { contrast: 50, brightness: 10 },
    category: "adjustments",
    description: "Bold look",
  },
  {
    name: "Warm Tone",
    settings: { saturation: 30, hue: 20 },
    category: "adjustments",
    description: "Warmer colors",
  },
  {
    name: "Cool Tone",
    settings: { saturation: 30, hue: -20 },
    category: "adjustments",
    description: "Cooler colors",
  },
  {
    name: "Dramatic",
    settings: { contrast: 40, brightness: -10, saturation: 20 },
    category: "adjustments",
    description: "Intense mood",
  },

  // Blur & Sharpen
  {
    name: "Blur",
    settings: { effect: "blur:300" },
    category: "blur",
    description: "Soft blur",
    exclusive: "blur-sharpen",
  },
  {
    name: "Sharpen",
    settings: { effect: "sharpen" },
    category: "blur",
    description: "Crisp edges",
    exclusive: "blur-sharpen",
  },
  {
    name: "Pixelate",
    settings: { effect: "pixelate:15" },
    category: "blur",
    description: "Pixel art",
    exclusive: "blur-sharpen",
  },

  // Transform
  {
    name: "Rotate 90°",
    settings: { angle: 90 },
    category: "transform",
    description: "Turn right",
  },
  {
    name: "Rotate 180°",
    settings: { angle: 180 },
    category: "transform",
    description: "Flip upside down",
  },
  {
    name: "Rotate 270°",
    settings: { angle: 270 },
    category: "transform",
    description: "Turn left",
  },
  {
    name: "Flip Horizontal",
    settings: { flip: "horizontal" },
    category: "transform",
    description: "Mirror",
  },
  {
    name: "Flip Vertical",
    settings: { flip: "vertical" },
    category: "transform",
    description: "Flip",
  },
  {
    name: "Zoom 2x",
    settings: { zoom: 2 },
    category: "transform",
    description: "Enlarge",
  },
  {
    name: "Zoom 0.5x",
    settings: { zoom: 0.5 },
    category: "transform",
    description: "Shrink",
  },
];

// Category metadata for UI
const CATEGORY_INFO: Record<
  PresetCategory,
  { label: string; icon: string; description: string }
> = {
  resize: {
    label: "Resize & Crop",
    icon: "📐",
    description: "Change dimensions and cropping",
  },
  shape: {
    label: "Shape",
    icon: "⭕",
    description: "Rounded corners and shapes",
  },
  color: {
    label: "Color Effects",
    icon: "🎨",
    description: "Color transformations",
  },
  artistic: {
    label: "Artistic",
    icon: "🖼️",
    description: "Artistic filters (one at a time)",
  },
  adjustments: {
    label: "Adjustments",
    icon: "⚙️",
    description: "Fine-tune appearance",
  },
  blur: { label: "Blur & Sharpen", icon: "💫", description: "Focus effects" },
  transform: {
    label: "Transform",
    icon: "🔄",
    description: "Rotate, flip, zoom",
  },
};

// Helper to get human-readable transformation labels
const TRANSFORM_LABELS: Record<string, string> = {
  width: "Width",
  height: "Height",
  crop: "Crop Mode",
  gravity: "Gravity",
  quality: "Quality",
  format: "Format",
  effect: "Effect",
  radius: "Radius",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  hue: "Hue",
  gamma: "Gamma",
  angle: "Angle",
  flip: "Flip",
  zoom: "Zoom",
  responsive: "Responsive",
  auto: "Auto Optimize",
};

// Check if effect is an artistic filter (mutually exclusive)
const isArtisticEffect = (effect: string): boolean => {
  return (
    effect.startsWith("art:") ||
    effect.startsWith("oil_paint") ||
    effect === "sketch" ||
    effect.startsWith("cartoonify")
  );
};

// Check if effect is a color effect
const isColorEffect = (effect: string): boolean => {
  return ["blackwhite", "sepia", "grayscale", "invert"].includes(effect);
};

// Check if effect is blur/sharpen
const isBlurEffect = (effect: string): boolean => {
  return (
    effect.startsWith("blur") ||
    effect === "sharpen" ||
    effect.startsWith("pixelate")
  );
};

function App() {
  const images = useQuery(api.example.listImages);
  const uploadImage = useAction(api.example.uploadImage);
  const deleteImage = useAction(api.example.deleteImage);
  const uploadImageDirect = useAction(api.example.uploadImageDirect);
  const finalizeDirectUpload = useAction(api.example.finalizeDirectUpload);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMethod, setUploadMethod] = useState<"base64" | "direct" | null>(
    null
  );
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedImageForTransform, setSelectedImageForTransform] =
    useState<CloudinaryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for staged file (selected but not uploaded yet)
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedFilePreview, setStagedFilePreview] = useState<string | null>(
    null
  );

  // Note: Frontend doesn't need Cloudinary credentials
  // All uploads go through backend actions which have the proper credentials

  // Clear selected image if it no longer exists in the images list
  useEffect(() => {
    if (selectedImageForTransform && images) {
      const imageStillExists = images.some(
        (img) => img.publicId === selectedImageForTransform.publicId
      );
      if (!imageStillExists) {
        setSelectedImageForTransform(null);
      }
    }
  }, [images, selectedImageForTransform]);

  const [transformSettings, setTransformSettings] =
    useState<TransformationOptions>({
      width: 300,
      height: 300,
      crop: "fill",
      quality: "auto",
      format: "auto",
    });

  // Active preset category tab
  const [activeCategory, setActiveCategory] =
    useState<PresetCategory>("resize");

  // Compatibility warning state
  const [compatibilityWarning, setCompatibilityWarning] = useState<
    string | null
  >(null);

  const getTransformedUrl = useQuery(
    api.example.getTransformedImageUrl,
    selectedImageForTransform &&
      images &&
      images.some((img) => img.publicId === selectedImageForTransform.publicId)
      ? {
          publicId: selectedImageForTransform.publicId,
          transformation: transformSettings,
        }
      : "skip"
  );

  // Get active transformations as array for display
  const activeTransformations = useMemo(() => {
    const active: Array<{
      key: string;
      value: string | number | boolean;
      label: string;
    }> = [];

    Object.entries(transformSettings).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== 0
      ) {
        // Skip default values
        if (key === "quality" && value === "auto") return;
        if (key === "format" && value === "auto") return;
        if (key === "brightness" && value === 0) return;
        if (key === "contrast" && value === 0) return;
        if (key === "saturation" && value === 0) return;
        if (key === "hue" && value === 0) return;

        active.push({
          key,
          value,
          label: TRANSFORM_LABELS[key] || key,
        });
      }
    });

    return active;
  }, [transformSettings]);

  // Remove a specific transformation
  const removeTransformation = useCallback((key: string) => {
    setTransformSettings((prev) => {
      const updated = { ...prev };
      // For numeric adjustments, reset to 0 instead of undefined
      if (["brightness", "contrast", "saturation", "hue"].includes(key)) {
        (updated as any)[key] = 0;
      } else {
        delete (updated as any)[key];
      }
      return updated;
    });
    setCompatibilityWarning(null);
  }, []);

  // Check and warn about incompatible transformations
  const checkCompatibility = useCallback(
    (newSettings: Partial<TransformationOptions>): string | null => {
      if (!newSettings.effect) return null;

      const currentEffect = transformSettings.effect;
      const newEffect = newSettings.effect;

      if (!currentEffect || !newEffect) return null;

      // Artistic filters are mutually exclusive
      if (
        isArtisticEffect(currentEffect) &&
        isArtisticEffect(newEffect) &&
        currentEffect !== newEffect
      ) {
        return `Artistic filters are mutually exclusive. "${newEffect}" will replace "${currentEffect}".`;
      }

      // Color effects replace each other
      if (
        isColorEffect(currentEffect) &&
        isColorEffect(newEffect) &&
        currentEffect !== newEffect
      ) {
        return `Color effects replace each other. "${newEffect}" will replace "${currentEffect}".`;
      }

      // Blur effects replace each other
      if (
        isBlurEffect(currentEffect) &&
        isBlurEffect(newEffect) &&
        currentEffect !== newEffect
      ) {
        return `Blur/sharpen effects replace each other. "${newEffect}" will replace "${currentEffect}".`;
      }

      return null;
    },
    [transformSettings]
  );

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection - stage the file without uploading
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Revoke any existing object URL to prevent memory leaks
    // This handles cases where user selects a new file after a failed upload
    if (stagedFilePreview) {
      URL.revokeObjectURL(stagedFilePreview);
    }

    // Stage the file
    setStagedFile(file);
    setUploadResult(null);
    setUploadMethod(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setStagedFilePreview(previewUrl);

    console.log(
      `File staged: ${file.name} (${Math.round((file.size / (1024 * 1024)) * 100) / 100}MB)`
    );
  };

  // Clear staged file
  const clearStagedFile = () => {
    if (stagedFilePreview) {
      URL.revokeObjectURL(stagedFilePreview);
    }
    setStagedFile(null);
    setStagedFilePreview(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload via Base64 (through Convex)
  const handleBase64Upload = async () => {
    if (!stagedFile) return;

    try {
      setIsUploading(true);
      setUploadMethod("base64");
      setUploadProgress(0);

      console.log(
        `Starting base64 upload for ${stagedFile.name} (${Math.round((stagedFile.size / (1024 * 1024)) * 100) / 100}MB)...`
      );

      const base64Data = await fileToBase64(stagedFile);
      setUploadProgress(50);

      const result = await uploadImage({
        base64Data,
        filename: stagedFile.name,
        folder: "base64-uploads",
        width: transformSettings.width,
        height: transformSettings.height,
      });

      setUploadProgress(100);
      setUploadResult({
        ...result,
        method: "base64",
      });

      console.log("Base64 upload success:", result);

      // Clear staged file after successful upload
      clearStagedFile();
    } catch (error) {
      console.error("Base64 upload failed:", error);
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMethod(null);
    }
  };

  // Upload directly to Cloudinary (bypassing Convex for file transfer)
  const handleDirectUpload = async () => {
    if (!stagedFile) return;

    try {
      setIsUploading(true);
      setUploadMethod("direct");
      setUploadProgress(0);

      console.log(
        `Starting direct upload for ${stagedFile.name} (${Math.round((stagedFile.size / (1024 * 1024)) * 100) / 100}MB)...`
      );

      // Step 1: Get upload credentials from Convex backend
      const credentials = await uploadImageDirect({
        filename: stagedFile.name,
        folder: "direct-uploads",
        tags: ["direct", "user-initiated"],
        width: transformSettings.width,
        height: transformSettings.height,
      });

      // Step 2: Upload directly to Cloudinary with progress tracking
      const uploadResult = await uploadDirectToCloudinary(
        stagedFile,
        credentials as UploadCredentials,
        (progress) => {
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        }
      );

      // Step 3: Finalize upload and store metadata in Convex
      const finalizeResult = await finalizeDirectUpload({
        publicId: uploadResult.public_id,
        uploadResult,
        folder: "direct-uploads",
      });

      if (finalizeResult.success) {
        setUploadResult({
          success: true,
          publicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          method: "direct",
        });
        console.log("Direct upload success:", uploadResult);

        // Clear staged file after successful upload
        clearStagedFile();
      } else {
        throw new Error(finalizeResult.error || "Failed to finalize upload");
      }
    } catch (error) {
      console.error("Direct upload failed:", error);
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMethod(null);
    }
  };

  // Auto upload based on file size (original behavior)
  const handleAutoUpload = async () => {
    if (!stagedFile) return;

    const fileSizeThreshold = 5 * 1024 * 1024; // 5MB threshold
    const isLarge = isLargeFile(stagedFile, fileSizeThreshold);

    if (isLarge) {
      await handleDirectUpload();
    } else {
      await handleBase64Upload();
    }
  };

  const handleDeleteImage = async (publicId: string) => {
    if (confirm(`Delete image ${publicId}?`)) {
      try {
        const result = await deleteImage({ publicId });
        console.log("Delete result:", result);

        if (result.success) {
          alert("Image deleted successfully!");

          if (
            selectedImageForTransform &&
            selectedImageForTransform.publicId === publicId
          ) {
            setSelectedImageForTransform(null);
          }
        } else {
          alert(`Delete failed: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Delete failed");
      }
    }
  };

  const applyPreset = useCallback(
    (preset: PresetDefinition) => {
      // Check for compatibility warning
      const warning = checkCompatibility(preset.settings);
      if (warning) {
        setCompatibilityWarning(warning);
      } else {
        setCompatibilityWarning(null);
      }

      setTransformSettings((prev) => ({ ...prev, ...preset.settings }));
    },
    [checkCompatibility]
  );

  const resetTransformations = useCallback(() => {
    setTransformSettings({
      width: 300,
      height: 300,
      crop: "fill",
      quality: "auto",
      format: "auto",
    });
    setCompatibilityWarning(null);
  }, []);

  // Get presets for current category
  const currentCategoryPresets = useMemo(() => {
    return PRESET_DEFINITIONS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  // Use the backend transformation result for preview
  const previewUrl = useMemo(() => {
    if (getTransformedUrl && getTransformedUrl.transformedUrl) {
      return getTransformedUrl.transformedUrl;
    }
    return null;
  }, [getTransformedUrl]);

  return (
    <div className="app">
      <h1>Cloudinary Convex Component</h1>

      <section className="upload-section">
        <h2>📤 Upload Images</h2>
        <div className="upload-info">
          <p>
            <strong>Upload Methods:</strong>
          </p>
          <ul>
            <li>
              📄 <strong>Base64 (via Convex):</strong> Best for small files
              (&lt; 5MB). File data passes through Convex backend.
            </li>
            <li>
              🚀 <strong>Direct (to Cloudinary):</strong> Best for large files.
              File uploads directly to Cloudinary, only metadata goes through
              Convex.
            </li>
            <li>
              ⚡ <strong>Auto:</strong> Automatically chooses based on file size
              (5MB threshold).
            </li>
          </ul>
          <p>
            <strong>Setup:</strong> Make sure to set CLOUDINARY_* environment
            variables in Convex.
          </p>
        </div>

        {/* Cloudinary Plan Limits Warning */}
        <div className="limits-warning">
          <h4>⚠️ Cloudinary Plan Limits</h4>
          <p>
            <strong>Free plan:</strong> Max 10 MB per image, 100 MB per video.{" "}
            <strong>Plus:</strong> 20 MB / 2 GB. <strong>Advanced:</strong> 40
            MB / 4 GB.
          </p>
          <p className="limits-note">
            Uploads exceeding your plan's limits will fail. See{" "}
            <a
              href="https://cloudinary.com/pricing/compare-plans"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudinary Pricing
            </a>{" "}
            for details.
          </p>
        </div>

        {/* Step 1: File Selection */}
        <div className="file-selection">
          <h3>Step 1: Select a File</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </div>

        {/* Staged File Preview */}
        {stagedFile && (
          <div className="staged-file">
            <h3>Step 2: Choose Upload Method</h3>
            <div className="staged-file-info">
              {stagedFilePreview && (
                <img
                  src={stagedFilePreview}
                  alt="Preview"
                  className="staged-preview-image"
                />
              )}
              <div className="staged-details">
                <p>
                  <strong>File:</strong> {stagedFile.name}
                </p>
                <p>
                  <strong>Size:</strong>{" "}
                  {Math.round((stagedFile.size / (1024 * 1024)) * 100) / 100}MB
                </p>
                <p>
                  <strong>Type:</strong> {stagedFile.type}
                </p>
                <p>
                  <strong>Recommended:</strong>{" "}
                  {isLargeFile(stagedFile, 5 * 1024 * 1024)
                    ? "🚀 Direct Upload (file is large)"
                    : "📄 Base64 Upload (file is small)"}
                </p>
              </div>
            </div>

            {/* Upload Method Buttons */}
            <div className="upload-method-buttons">
              <button
                className="upload-button base64-button"
                onClick={handleBase64Upload}
                disabled={isUploading}
                title="Upload through Convex backend as base64 data"
              >
                📄 Upload via Base64 (Convex)
              </button>
              <button
                className="upload-button direct-button"
                onClick={handleDirectUpload}
                disabled={isUploading}
                title="Upload directly to Cloudinary, bypassing Convex for file transfer"
              >
                🚀 Upload Direct (Cloudinary)
              </button>
              <button
                className="upload-button auto-button"
                onClick={handleAutoUpload}
                disabled={isUploading}
                title="Automatically choose based on file size"
              >
                ⚡ Auto Upload
              </button>
              <button
                className="cancel-button"
                onClick={clearStagedFile}
                disabled={isUploading}
              >
                ✖ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="upload-status">
            <p className="loading">
              🔄 Uploading via{" "}
              {uploadMethod === "direct" ? "Direct Upload" : "Base64"}...
            </p>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
            {uploadMethod === "base64" && uploadProgress < 50 && (
              <p className="upload-note">Reading file data...</p>
            )}
            {uploadMethod === "base64" && uploadProgress >= 50 && (
              <p className="upload-note">Uploading through Convex...</p>
            )}
            {uploadMethod === "direct" && (
              <p className="upload-note">Uploading directly to Cloudinary...</p>
            )}
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="success-message">
            <p>✅ Upload Success!</p>
            <p>
              <strong>Public ID:</strong> {uploadResult.publicId}
            </p>
            <p>
              <strong>Method Used:</strong>{" "}
              {uploadResult.method === "direct"
                ? "🚀 Direct Upload to Cloudinary"
                : "📄 Base64 Upload via Convex"}
            </p>
            {uploadResult.secureUrl && (
              <p>
                <strong>URL:</strong>{" "}
                <a
                  href={uploadResult.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Image
                </a>
              </p>
            )}
          </div>
        )}

        {/* Architecture Explanation */}
        <div className="architecture-info">
          <h3>📚 Upload Architecture</h3>
          <div className="architecture-comparison">
            <div className="architecture-method">
              <h4>📄 Base64 Upload (via Convex)</h4>
              <ol>
                <li>Client converts file to base64</li>
                <li>Base64 data sent to Convex action</li>
                <li>Convex action uploads to Cloudinary API</li>
                <li>Metadata stored in Convex database</li>
              </ol>
              <p className="pros">✅ Simple, secure, works with Convex</p>
              <p className="cons">
                ⚠️ Limited to ~10MB (Convex argument limit)
              </p>
            </div>
            <div className="architecture-method">
              <h4>🚀 Direct Upload (to Cloudinary)</h4>
              <ol>
                <li>Client requests signed credentials from Convex</li>
                <li>Convex generates secure signature</li>
                <li>Client uploads directly to Cloudinary</li>
                <li>Client sends result to Convex for metadata storage</li>
              </ol>
              <p className="pros">
                ✅ No size limit, progress tracking, faster for large files
              </p>
              <p className="cons">⚠️ More complex, requires CORS setup</p>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="gallery-section">
        <h2>🖼️ Uploaded Images</h2>
        {images === undefined ? (
          <p className="loading">Loading images...</p>
        ) : images.length === 0 ? (
          <div className="empty-state">
            <p>No images uploaded yet. Upload some images above!</p>
          </div>
        ) : (
          <div className="image-grid">
            {images.map((image: CloudinaryImage) => (
              <div key={image.publicId} className="image-card">
                <img
                  src={image.secureUrl}
                  alt={image.originalFilename || "Uploaded image"}
                  className="gallery-image"
                />
                <div className="image-info">
                  <h4>{image.originalFilename || image.publicId}</h4>
                  <p>
                    Size: {image.width} × {image.height}
                  </p>
                  <button
                    onClick={() => setSelectedImageForTransform(image)}
                    className="select-button"
                  >
                    🎨 Transform
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.publicId)}
                    className="delete-button"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transformation Interface */}
      {selectedImageForTransform &&
        images &&
        images.some(
          (img) => img.publicId === selectedImageForTransform.publicId
        ) && (
          <section className="transformation-section">
            <div className="studio-header">
              <h2>Image Transformation Studio</h2>
              <p className="studio-subtitle">
                Transform:{" "}
                <strong>
                  {selectedImageForTransform?.originalFilename ||
                    selectedImageForTransform?.publicId}
                </strong>
              </p>
            </div>

            {/* Active Transformations Panel */}
            <div className="active-transformations-panel">
              <div className="active-transformations-header">
                <h3>Active Transformations</h3>
                {activeTransformations.length > 0 && (
                  <button
                    onClick={resetTransformations}
                    className="clear-all-btn"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {activeTransformations.length === 0 ? (
                <p className="no-transforms-message">
                  No custom transformations applied. Select presets or adjust
                  settings below.
                </p>
              ) : (
                <div className="transform-chips">
                  {activeTransformations.map(({ key, value, label }) => (
                    <div key={key} className="transform-chip">
                      <span className="chip-label">{label}</span>
                      <span className="chip-value">
                        {typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : String(value)}
                      </span>
                      <button
                        onClick={() => removeTransformation(key)}
                        className="chip-remove"
                        title={`Remove ${label}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Compatibility Warning */}
              {compatibilityWarning && (
                <div className="compatibility-warning">
                  <span className="warning-icon">⚠️</span>
                  <span>{compatibilityWarning}</span>
                  <button
                    onClick={() => setCompatibilityWarning(null)}
                    className="dismiss-warning"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="transformation-layout">
              {/* Transformation Controls */}
              <div className="transformation-controls">
                {/* Category Tabs */}
                <div className="category-tabs">
                  {(Object.keys(CATEGORY_INFO) as PresetCategory[]).map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`category-tab ${activeCategory === category ? "active" : ""}`}
                        title={CATEGORY_INFO[category].description}
                      >
                        <span className="tab-icon">
                          {CATEGORY_INFO[category].icon}
                        </span>
                        <span className="tab-label">
                          {CATEGORY_INFO[category].label}
                        </span>
                      </button>
                    )
                  )}
                </div>

                {/* Category Description */}
                <div className="category-description">
                  <p>
                    {CATEGORY_INFO[activeCategory].icon}{" "}
                    {CATEGORY_INFO[activeCategory].description}
                    {activeCategory === "artistic" && (
                      <span className="exclusive-note">
                        {" "}
                        (Only one can be active)
                      </span>
                    )}
                  </p>
                </div>

                {/* Preset Grid for Current Category */}
                <div className="preset-section">
                  <div className="preset-grid-new">
                    {currentCategoryPresets.map((preset) => {
                      // Check if this preset is currently active
                      const isActive = Object.entries(preset.settings).every(
                        ([key, value]) =>
                          (transformSettings as any)[key] === value
                      );

                      return (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(preset)}
                          className={`preset-card ${isActive ? "active" : ""}`}
                          title={preset.description}
                        >
                          <span className="preset-name">{preset.name}</span>
                          {preset.description && (
                            <span className="preset-desc">
                              {preset.description}
                            </span>
                          )}
                          {isActive && (
                            <span className="active-indicator">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Controls */}
                <div className="manual-controls">
                  <h4>Fine-tune Settings</h4>

                  {/* Basic Transformations */}
                  <div className="control-group">
                    <h5>Dimensions</h5>
                    <div className="control-row">
                      <label>
                        Width:
                        <input
                          type="number"
                          value={transformSettings.width || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              width: parseInt(e.target.value) || undefined,
                            }))
                          }
                          min="1"
                          max="4000"
                          placeholder="Auto"
                        />
                      </label>
                      <label>
                        Height:
                        <input
                          type="number"
                          value={transformSettings.height || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              height: parseInt(e.target.value) || undefined,
                            }))
                          }
                          min="1"
                          max="4000"
                          placeholder="Auto"
                        />
                      </label>
                    </div>

                    <div className="control-row">
                      <label>
                        Crop Mode:
                        <select
                          value={transformSettings.crop || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              crop: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">No crop</option>
                          <option value="fill">Fill</option>
                          <option value="fit">Fit</option>
                          <option value="crop">Crop</option>
                          <option value="scale">Scale</option>
                          <option value="thumb">Thumbnail</option>
                          <option value="pad">Pad</option>
                          <option value="limit">Limit</option>
                        </select>
                      </label>
                      <label>
                        Gravity:
                        <select
                          value={transformSettings.gravity || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              gravity: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">Auto</option>
                          <option value="center">Center</option>
                          <option value="north">North</option>
                          <option value="south">South</option>
                          <option value="east">East</option>
                          <option value="west">West</option>
                          <option value="face">Face</option>
                          <option value="faces">Faces</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Effects */}
                  <div className="control-group">
                    <h5>Effects</h5>
                    <div className="control-row">
                      <label>
                        Effect:
                        <select
                          value={transformSettings.effect || ""}
                          onChange={(e) => {
                            const newEffect = e.target.value || undefined;
                            if (newEffect && transformSettings.effect) {
                              const warning = checkCompatibility({
                                effect: newEffect,
                              });
                              setCompatibilityWarning(warning);
                            } else {
                              setCompatibilityWarning(null);
                            }
                            setTransformSettings((prev) => ({
                              ...prev,
                              effect: newEffect,
                            }));
                          }}
                        >
                          <option value="">No effect</option>
                          <optgroup label="Color Effects">
                            <option value="blackwhite">Black & White</option>
                            <option value="sepia">Sepia</option>
                            <option value="grayscale">Grayscale</option>
                            <option value="invert">Invert</option>
                          </optgroup>
                          <optgroup label="Artistic Filters">
                            <option value="art:audrey">Vintage (Audrey)</option>
                            <option value="art:zorro">Zorro</option>
                            <option value="art:aurora">Aurora</option>
                            <option value="oil_paint:6">Oil Paint</option>
                            <option value="sketch">Sketch</option>
                            <option value="cartoonify:70">Cartoon</option>
                          </optgroup>
                          <optgroup label="Blur & Sharpen">
                            <option value="blur:300">Blur</option>
                            <option value="sharpen">Sharpen</option>
                            <option value="pixelate:15">Pixelate</option>
                          </optgroup>
                        </select>
                      </label>
                      <label>
                        Radius:
                        <input
                          type="number"
                          value={
                            typeof transformSettings.radius === "number"
                              ? transformSettings.radius
                              : ""
                          }
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              radius: parseInt(e.target.value) || undefined,
                            }))
                          }
                          min="0"
                          max="2000"
                          placeholder="0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Color Adjustments */}
                  <div className="control-group">
                    <h5>Color Adjustments</h5>
                    <div className="slider-control">
                      <label>
                        <span className="slider-label">Brightness</span>
                        <div className="slider-row">
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={transformSettings.brightness || 0}
                            onChange={(e) =>
                              setTransformSettings((prev) => ({
                                ...prev,
                                brightness: parseInt(e.target.value),
                              }))
                            }
                          />
                          <span className="slider-value">
                            {transformSettings.brightness || 0}
                          </span>
                        </div>
                      </label>
                    </div>
                    <div className="slider-control">
                      <label>
                        <span className="slider-label">Contrast</span>
                        <div className="slider-row">
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={transformSettings.contrast || 0}
                            onChange={(e) =>
                              setTransformSettings((prev) => ({
                                ...prev,
                                contrast: parseInt(e.target.value),
                              }))
                            }
                          />
                          <span className="slider-value">
                            {transformSettings.contrast || 0}
                          </span>
                        </div>
                      </label>
                    </div>
                    <div className="slider-control">
                      <label>
                        <span className="slider-label">Saturation</span>
                        <div className="slider-row">
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={transformSettings.saturation || 0}
                            onChange={(e) =>
                              setTransformSettings((prev) => ({
                                ...prev,
                                saturation: parseInt(e.target.value),
                              }))
                            }
                          />
                          <span className="slider-value">
                            {transformSettings.saturation || 0}
                          </span>
                        </div>
                      </label>
                    </div>
                    <div className="slider-control">
                      <label>
                        <span className="slider-label">Hue</span>
                        <div className="slider-row">
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={transformSettings.hue || 0}
                            onChange={(e) =>
                              setTransformSettings((prev) => ({
                                ...prev,
                                hue: parseInt(e.target.value),
                              }))
                            }
                          />
                          <span className="slider-value">
                            {transformSettings.hue || 0}°
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Transform Controls */}
                  <div className="control-group">
                    <h5>Transform</h5>
                    <div className="control-row">
                      <label>
                        Angle:
                        <input
                          type="number"
                          value={transformSettings.angle || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              angle: parseInt(e.target.value) || undefined,
                            }))
                          }
                          min="-360"
                          max="360"
                          placeholder="0°"
                        />
                      </label>
                      <label>
                        Flip:
                        <select
                          value={transformSettings.flip || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              flip: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">No flip</option>
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                          <option value="both">Both</option>
                        </select>
                      </label>
                    </div>
                    <div className="control-row">
                      <label>
                        Zoom:
                        <input
                          type="number"
                          value={transformSettings.zoom || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              zoom: parseFloat(e.target.value) || undefined,
                            }))
                          }
                          min="0.1"
                          max="10"
                          step="0.1"
                          placeholder="1.0"
                        />
                      </label>
                      <label>
                        Gamma:
                        <input
                          type="number"
                          value={transformSettings.gamma || ""}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              gamma: parseFloat(e.target.value) || undefined,
                            }))
                          }
                          min="0.1"
                          max="10"
                          step="0.1"
                          placeholder="1.0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Quality and Format */}
                  <div className="control-group">
                    <h5>Output Settings</h5>
                    <div className="control-row">
                      <label>
                        Quality:
                        <select
                          value={String(transformSettings.quality) || "auto"}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              quality: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="auto">Auto</option>
                          <option value="best">Best</option>
                          <option value="good">Good</option>
                          <option value="eco">Eco</option>
                          <option value="low">Low</option>
                        </select>
                      </label>
                      <label>
                        Format:
                        <select
                          value={transformSettings.format || "auto"}
                          onChange={(e) =>
                            setTransformSettings((prev) => ({
                              ...prev,
                              format: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="auto">Auto</option>
                          <option value="webp">WebP</option>
                          <option value="jpg">JPEG</option>
                          <option value="png">PNG</option>
                          <option value="gif">GIF</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Area */}
              <div className="preview-area">
                <h3>Live Preview</h3>

                {/* Image Comparison */}
                <div className="image-comparison">
                  <div className="comparison-item">
                    <h4>Original</h4>
                    {selectedImageForTransform && (
                      <img
                        src={selectedImageForTransform.secureUrl}
                        alt="Original image"
                        className="preview-image"
                      />
                    )}
                  </div>

                  <div className="comparison-item">
                    <h4>Transformed</h4>
                    <div className="image-preview">
                      {getTransformedUrl === undefined ? (
                        <div className="loading">Loading preview...</div>
                      ) : previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Transformed preview"
                          className="preview-image"
                        />
                      ) : (
                        <div className="no-preview">
                          <p>Select transformation options to see preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {previewUrl && (
                  <div className="preview-info">
                    <p>
                      <strong>Preview URL:</strong>
                    </p>
                    <code className="url-display">{previewUrl}</code>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="preview-link"
                    >
                      Open in New Tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      {/* Message when transformation studio is hidden due to deleted image */}
      {selectedImageForTransform &&
        images &&
        !images.some(
          (img) => img.publicId === selectedImageForTransform.publicId
        ) && (
          <section className="deleted-image-message">
            <h2>⚠️ Image No Longer Available</h2>
            <p>
              The image "
              {selectedImageForTransform.originalFilename ||
                selectedImageForTransform.publicId}
              " has been deleted and is no longer available for transformation.
            </p>
            <button
              onClick={() => setSelectedImageForTransform(null)}
              className="clear-selection-button"
            >
              Clear Selection
            </button>
          </section>
        )}

      {/* API Status */}
      <section className="api-section">
        <h2>📊 Component Status</h2>
        <ul>
          <li className="status-icon">
            ✅ <strong>Upload:</strong> Direct REST API calls to Cloudinary
          </li>
          <li className="status-icon">
            ✅ <strong>List Assets:</strong> Database integration working
          </li>
          <li className="status-icon">
            ✅ <strong>Delete:</strong> Cloudinary + Database cleanup
          </li>
          <li className="status-icon">
            ✅ <strong>Transformations:</strong> Comprehensive transformation
            options
          </li>
          <li className="status-icon">
            ✅ <strong>Real-time Preview:</strong> Live transformation preview
          </li>
        </ul>
      </section>
    </div>
  );
}

export default App;
