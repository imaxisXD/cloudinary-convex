import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef } from "react";

function App() {
  const images = useQuery(api.example.listImages);
  const uploadImage = useAction(api.example.uploadImage);
  const deleteImage = useAction(api.example.deleteImage);
  const getTransformedUrl = useQuery(api.example.getTransformedImageUrl, {
    publicId: "sample",
    width: 300,
    height: 300,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [transformSettings, setTransformSettings] = useState({
    width: 300,
    height: 300,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <section
        style={{
          margin: "20px 0",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h2>📤 Upload Images</h2>

        {/* Transform Settings */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ marginRight: "10px" }}>
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
              style={{ marginLeft: "5px", width: "80px" }}
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
              style={{ marginLeft: "5px", width: "80px" }}
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
          style={{ marginBottom: "10px" }}
        />

        {isUploading && <p>🔄 Uploading...</p>}

        {uploadResult && (
          <div
            style={{
              margin: "10px 0",
              padding: "10px",
              backgroundColor: "#f0f8f0",
              borderRadius: "4px",
            }}
          >
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
      <section
        style={{
          margin: "20px 0",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h2>🖼️ Uploaded Images</h2>
        {images === undefined ? (
          <p>Loading images...</p>
        ) : images.length === 0 ? (
          <p>No images uploaded yet. Upload some images above!</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {images.map((image) => (
              <div
                key={image.publicId}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <img
                  src={image.secureUrl}
                  alt={image.originalFilename || "Uploaded image"}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ marginTop: "10px" }}>
                  <h4 style={{ margin: "5px 0" }}>
                    {image.originalFilename || image.publicId}
                  </h4>
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
                    style={{
                      backgroundColor: "#ff4444",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginTop: "10px",
                    }}
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
      {getTransformedUrl && (
        <section
          style={{
            margin: "20px 0",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h2>🎨 Transformation Demo</h2>
          <p>
            This shows URL generation for transformations (if you have a
            'sample' image):
          </p>
          <p>
            <strong>Transformed URL:</strong>{" "}
            <a
              href={getTransformedUrl.transformedUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Transformed
            </a>
          </p>
        </section>
      )}

      {/* API Status */}
      <section
        style={{
          margin: "20px 0",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h2>📊 Component Status</h2>
        <ul>
          <li>
            ✅ <strong>Upload:</strong> Direct REST API calls to Cloudinary
          </li>
          <li>
            ✅ <strong>List Assets:</strong> Database integration working
          </li>
          <li>
            ✅ <strong>Delete:</strong> Cloudinary + Database cleanup
          </li>
          <li>
            ✅ <strong>Transformations:</strong> Applied during upload
          </li>
          <li>
            ✅ <strong>No SDK Dependencies:</strong> Pure REST API integration
          </li>
        </ul>

        <div style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
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
