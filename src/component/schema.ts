import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assets: defineTable({
    // Cloudinary identifiers
    publicId: v.string(),
    cloudinaryUrl: v.string(),
    secureUrl: v.string(),
    
    // Asset metadata
    originalFilename: v.optional(v.string()),
    format: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    bytes: v.optional(v.number()),
    
    // Transformation info
    transformations: v.optional(v.array(v.any())), // Store transformation objects
    
    // Organization and search
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    
    // Additional metadata
    metadata: v.optional(v.any()), // For custom metadata
    
    // Timestamps
    uploadedAt: v.number(),
    updatedAt: v.number(),
    
    // User context (if needed for multi-tenant scenarios)
    userId: v.optional(v.string()),
  })
    .index("by_publicId", ["publicId"])
    .index("by_userId", ["userId"])
    .index("by_folder", ["folder"])
    .index("by_tags", ["tags"])
    .index("by_uploadedAt", ["uploadedAt"]),
});
