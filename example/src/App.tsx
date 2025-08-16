import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useMemo, useEffect } from "react";

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

function App() {
  const images = useQuery(api.example.listImages);
  const uploadImage = useAction(api.example.uploadImage);
  const deleteImage = useAction(api.example.deleteImage);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedImageForTransform, setSelectedImageForTransform] =
    useState<CloudinaryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Predefined transformation presets
  const transformationPresets = {
    "Basic Resize": { width: 300, height: 300, crop: "fill" },
    "Square Thumbnail": {
      width: 150,
      height: 150,
      crop: "thumb",
      gravity: "face",
    },
    Landscape: { width: 800, height: 400, crop: "fill" },
    Portrait: { width: 400, height: 600, crop: "fill" },
    Circle: { width: 200, height: 200, crop: "fill", radius: "max" },
    "Rounded Corners": { width: 300, height: 300, crop: "fill", radius: 20 },
    "Black & White": { effect: "blackwhite" },
    Sepia: { effect: "sepia" },
    Vintage: { effect: "art:audrey" },
    "Oil Painting": { effect: "oil_paint:6" },
    Sketch: { effect: "sketch" },
    Blur: { effect: "blur:300" },
    Sharpen: { effect: "sharpen" },
    Brightness: { brightness: 20 },
    Contrast: { contrast: 20 },
    Saturation: { saturation: -50 },
    Grayscale: { effect: "grayscale" },
    Invert: { effect: "invert" },
    Pixelate: { effect: "pixelate:15" },
    Cartoon: { effect: "cartoonify:70" },
    "Rotate 90°": { angle: 90 },
    "Rotate 180°": { angle: 180 },
    "Rotate 270°": { angle: 270 },
    "Flip Horizontal": { flip: "horizontal" },
    "Flip Vertical": { flip: "vertical" },
    "Zoom 2x": { zoom: 2 },
    "Zoom 0.5x": { zoom: 0.5 },
    "High Contrast": { contrast: 50, brightness: 10 },
    "Warm Tone": { saturation: 30, hue: 20 },
    "Cool Tone": { saturation: 30, hue: -20 },
    Dramatic: { contrast: 40, brightness: -10, saturation: 20 },
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadResult(null);

      const base64Data = await fileToBase64(file);

      const result = await uploadImage({
        base64Data,
        filename: file.name,
        folder: "test-uploads",
        width: transformSettings.width,
        height: transformSettings.height,
      });

      setUploadResult(result);
      console.log("Upload success:", result);

      // Auto-select the newly uploaded image for transformation
      if (result.publicId) {
        // Find the uploaded image in the images list to set as selected
        const uploadedImage = images?.find(
          (img) => img.publicId === result.publicId
        );
        if (uploadedImage) {
          setSelectedImageForTransform(uploadedImage);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
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

  const applyPreset = (presetName: string) => {
    const preset =
      transformationPresets[presetName as keyof typeof transformationPresets];
    if (preset) {
      setTransformSettings((prev) => ({ ...prev, ...preset }));
    }
  };

  const resetTransformations = () => {
    setTransformSettings({
      width: 300,
      height: 300,
      crop: "fill",
      quality: "auto",
      format: "auto",
    });
  };

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        {isUploading && <p className="loading">🔄 Uploading...</p>}
        {uploadResult && (
          <div className="success-message">
            <p>✅ Upload Success! Public ID: {uploadResult.publicId}</p>
          </div>
        )}
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
            <h2>🎨 Image Transformation Studio</h2>
            <p>
              Selected:{" "}
              {selectedImageForTransform?.originalFilename ||
                selectedImageForTransform?.publicId}
            </p>

            <div className="transformation-layout">
              {/* Transformation Controls */}
              <div className="transformation-controls">
                <h3>Transformation Options</h3>

                {/* Preset Buttons */}
                <div className="preset-buttons">
                  <h4>Quick Presets</h4>
                  <div className="preset-grid">
                    {Object.keys(transformationPresets).map((presetName) => (
                      <button
                        key={presetName}
                        onClick={() => applyPreset(presetName)}
                        className="preset-button"
                      >
                        {presetName}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetTransformations}
                    className="reset-button"
                  >
                    🔄 Reset All
                  </button>
                </div>

                {/* Basic Transformations */}
                <div className="control-group">
                  <h4>Basic Transformations</h4>
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

                {/* Effects and Enhancements */}
                <div className="control-group">
                  <h4>Effects & Enhancements</h4>
                  <div className="control-row">
                    <label>
                      Effect:
                      <select
                        value={transformSettings.effect || ""}
                        onChange={(e) =>
                          setTransformSettings((prev) => ({
                            ...prev,
                            effect: e.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">No effect</option>
                        <option value="blackwhite">Black & White</option>
                        <option value="sepia">Sepia</option>
                        <option value="grayscale">Grayscale</option>
                        <option value="invert">Invert</option>
                        <option value="blur:300">Blur</option>
                        <option value="sharpen">Sharpen</option>
                        <option value="pixelate:15">Pixelate</option>
                        <option value="cartoonify:70">Cartoon</option>
                        <option value="oil_paint:6">Oil Paint</option>
                        <option value="sketch">Sketch</option>
                        <option value="art:audrey">Vintage</option>
                        <option value="art:zorro">Zorro</option>
                        <option value="art:aurora">Aurora</option>
                      </select>
                    </label>
                    <label>
                      Radius:
                      <input
                        type="number"
                        value={transformSettings.radius || ""}
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
                  <h4>Color Adjustments</h4>
                  <div className="control-row">
                    <label>
                      Brightness:
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
                      <span>{transformSettings.brightness || 0}</span>
                    </label>
                  </div>
                  <div className="control-row">
                    <label>
                      Contrast:
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
                      <span>{transformSettings.contrast || 0}</span>
                    </label>
                  </div>
                  <div className="control-row">
                    <label>
                      Saturation:
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
                      <span>{transformSettings.saturation || 0}</span>
                    </label>
                  </div>
                  <div className="control-row">
                    <label>
                      Hue:
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
                      <span>{transformSettings.hue || 0}</span>
                    </label>
                  </div>
                </div>

                {/* Advanced Transformations */}
                <div className="control-group">
                  <h4>Advanced Transformations</h4>
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
                        placeholder="0"
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
                  <h4>Quality & Format</h4>
                  <div className="control-row">
                    <label>
                      Quality:
                      <select
                        value={transformSettings.quality || ""}
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
                        value={transformSettings.format || ""}
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
                  <div className="control-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={transformSettings.responsive || false}
                        onChange={(e) =>
                          setTransformSettings((prev) => ({
                            ...prev,
                            responsive: e.target.checked,
                          }))
                        }
                      />
                      Responsive Design
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          transformSettings.auto === "f_auto,q_auto" || false
                        }
                        onChange={(e) =>
                          setTransformSettings((prev) => ({
                            ...prev,
                            auto: e.target.checked
                              ? "f_auto,q_auto"
                              : undefined,
                          }))
                        }
                      />
                      Auto Optimization
                    </label>
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
                        <div className="loading">🔄 Loading...</div>
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
                      🔗 Open in New Tab
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
