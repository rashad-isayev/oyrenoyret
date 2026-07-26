export const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB

// Upload keys are UUID-based and never overwritten. Cache them in the viewer's
// browser without permitting shared caches to retain authenticated responses.
export const AUTHENTICATED_MEDIA_CACHE_CONTROL =
  'private, max-age=86400, immutable';

// Max number of images allowed in a single discussion post or reply.
export const MAX_DISCUSSION_IMAGES = 2;
