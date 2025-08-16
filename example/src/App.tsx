import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef } from "react";

// Define the image type based on the API response
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

function App() {
  const images = useQuery(api.example.listImages);
  const uploadImage = useAction(api.example.uploadImage);
  const deleteImage = useAction(api.example.deleteImage);

  // Remove the hardcoded transformation query
  // const getTransformedUrl = useQuery(api.example.getTransformedImageUrl, {
  //   publicId: "sample",
  //   width: 300,
  //   height: 300,
  // });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [transformSettings, setTransformSettings] = useState({
    width: 300,
    height: 300,
  });
  const [selectedImageForTransform, setSelectedImageForTransform] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get transformed URL for the selected image
  const getTransformedUrl = useQuery(
    api.example.getTransformedImageUrl,
    selectedImageForTransform
      ? {
          publicId: selectedImageForTransform,
          width: transformSettings.width,
          height: transformSettings.height,
        }
      : "skip"
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
        setSelectedImageForTransform(result.publicId);
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
        } else {
          alert(`Delete failed: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Delete failed");
      }
    }
  };

  return (
    <div className="app">
      <h1>🌩️ Cloudinary Component Test App</h1>
      <p>Testing direct Cloudinary REST API integration with Convex</p>

      {/* Upload Section */}
      <section>
        <h2>📤 Upload Images</h2>

        {/* Transform Settings */}
        <div className="controls">
          <label>
            Width:
            <input
              type="number"
              value={transformSettings.width}
              onChange={(e) =>
                setTransformSettings((prev) => ({
                  ...prev,
                  width: parseInt(e.target.value) || 300,
                }))
              }
              min="50"
              max="1000"
            />
          </label>
          <label>
            Height:
            <input
              type="number"
              value={transformSettings.height}
              onChange={(e) =>
                setTransformSettings((prev) => ({
                  ...prev,
                  height: parseInt(e.target.value) || 300,
                }))
              }
              min="50"
              max="1000"
            />
          </label>
        </div>

        {/* File Input */}
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
            <p>✅ Upload Success!</p>
            <p>
              <strong>Public ID:</strong> {uploadResult.publicId}
            </p>
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
            {uploadResult.width && uploadResult.height && (
              <p>
                <strong>Size:</strong> {uploadResult.width} ×{" "}
                {uploadResult.height}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Image Gallery */}
      <section>
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
                    <strong>Format:</strong> {image.format}
                  </p>
                  <p>
                    <strong>Size:</strong> {image.width} × {image.height}
                  </p>
                  {image.bytes && (
                    <p>
                      <strong>File size:</strong>{" "}
                      {Math.round(image.bytes / 1024)} KB
                    </p>
                  )}
                  {image.tags && (
                    <p>
                      <strong>Tags:</strong> {image.tags.join(", ")}
                    </p>
                  )}
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

      {/* Transformation Demo */}
      <section>
        <h2>
          🎨 Transformation Demo ({transformSettings.width}×
          {transformSettings.height})
        </h2>
        <p>
          Select an image and adjust dimensions above to see real-time
          transformations:
        </p>

        {/* Image Selection */}
        {images && images.length > 0 && (
          <div className="controls">
            <label>
              Select Image:
              <select
                value={selectedImageForTransform || ""}
                onChange={(e) =>
                  setSelectedImageForTransform(e.target.value || null)
                }
              >
                <option value="">Choose an image...</option>
                {images.map((image: CloudinaryImage) => (
                  <option key={image.publicId} value={image.publicId}>
                    {image.originalFilename || image.publicId}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Transformation Display */}
        {selectedImageForTransform && getTransformedUrl ? (
          <div className="success-message">
            <p>
              🎯 <strong>Transformation Applied!</strong>
            </p>
            <p>
              <strong>Original Image:</strong> {selectedImageForTransform}
            </p>
            <p>
              <strong>Dimensions:</strong> {transformSettings.width} ×{" "}
              {transformSettings.height}
            </p>
            <p>
              <strong>Transformed URL:</strong>{" "}
              <a
                href={getTransformedUrl.transformedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Transformed Image
              </a>
            </p>
            <p>
              <strong>Original URL:</strong>{" "}
              <a
                href={getTransformedUrl.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Original Image
              </a>
            </p>
          </div>
        ) : selectedImageForTransform ? (
          <p className="loading">🔄 Generating transformation...</p>
        ) : (
          <p className="empty-state">
            {images && images.length > 0
              ? "Select an image above to see transformations"
              : "Upload some images first to test transformations"}
          </p>
        )}
      </section>

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
            ✅ <strong>Transformations:</strong> Applied during upload
          </li>
          <li className="status-icon">
            ✅ <strong>No SDK Dependencies:</strong> Pure REST API integration
          </li>
        </ul>

        <div style={{ marginTop: "15px", fontSize: "14px", color: "#64748b" }}>
          <p>
            <strong>Backend Functions Used:</strong>
          </p>
          <ul>
            <li>
              <code>api.example.uploadImage</code> →{" "}
              <code>components.cloudinary.lib.upload</code>
            </li>
            <li>
              <code>api.example.listImages</code> →{" "}
              <code>components.cloudinary.lib.listAssets</code>
            </li>
            <li>
              <code>api.example.deleteImage</code> →{" "}
              <code>components.cloudinary.lib.deleteAsset</code>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default App;
