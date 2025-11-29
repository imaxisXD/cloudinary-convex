# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-11-29

### Added

- **Two Upload Methods**: Base64 upload for small files, direct upload for large files
- **Large File Support**: Direct browser-to-Cloudinary uploads with signed URLs (bypasses Convex 16MB limit)
- **Progress Tracking**: Real-time upload progress for direct uploads
- **Dynamic Transformations**: Generate transformed URLs on-the-fly with full transformation support
- **Asset Management**: Track and manage all uploaded assets in Convex database
- **Type Safety**: Full TypeScript support with exported validators (`vAssetResponse`, `vTransformation`, `vCloudinaryUploadResponse`)
- **Secure Uploads**: Server-side signature generation with environment-based credentials
- **Database Integration**: Automatic asset tracking with optimized indexes (`by_publicId`, `by_userId`, `by_folder`, `by_uploadedAt`)
- **React Hooks**: `useCloudinaryUpload`, `useCloudinaryImage`, `useCloudinaryAssets`, `useCloudinaryAsset`, `useCloudinaryOperations`
- **React Components**: `CloudinaryImage`, `CloudinaryUpload` with drag-and-drop support
- **File Validation**: Client-side validation for file types, sizes with configurable limits
- **Retry Logic**: Automatic retry with exponential backoff for failed uploads
- **Comprehensive Documentation**: Full API reference and usage examples

### Security

- Server-side credential management (API secrets never exposed to client)
- Signed upload URLs with timestamp validation
- Input validation for all user-provided parameters

## [0.0.0]

- Initial project setup
