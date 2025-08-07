import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Upload a photo blob to Firebase Storage
 * @param {Blob} photoBlob - The photo blob to upload
 * @param {string} playerId - The player's ID for the file path
 * @returns {Promise<string>} The download URL of the uploaded photo
 */
export const uploadPlayerPhoto = async (photoBlob, playerId) => {
  try {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `player-photos/${playerId}/${timestamp}.jpg`;
    
    // Create a storage reference
    const photoRef = ref(storage, filename);
    
    // Upload the file
    const snapshot = await uploadBytes(photoRef, photoBlob, {
      contentType: 'image/jpeg'
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error('Failed to upload photo. Please try again.');
  }
};

/**
 * Delete a photo from Firebase Storage using its URL
 * @param {string} photoUrl - The URL of the photo to delete
 * @returns {Promise<void>}
 */
export const deletePlayerPhoto = async (photoUrl) => {
  try {
    if (!photoUrl || typeof photoUrl !== 'string') {
      console.log('deletePlayerPhoto: No valid URL provided');
      return;
    }

    // Check if it's a Firebase Storage URL
    if (!photoUrl.includes('firebasestorage.googleapis.com')) {
      console.log('deletePlayerPhoto: Not a Firebase Storage URL, skipping deletion');
      return;
    }

    console.log('deletePlayerPhoto: Attempting to delete:', photoUrl);
    
    // Extract the file path from the URL
    const url = new URL(photoUrl);
    console.log('deletePlayerPhoto: URL pathname:', url.pathname);
    
    // Try different patterns to extract the file path
    let filePath = null;
    
    // Pattern 1: /o/path?alt=media (most common)
    let pathMatch = url.pathname.match(/\/o\/(.+)$/);
    if (pathMatch) {
      filePath = decodeURIComponent(pathMatch[1]);
    } else {
      // Pattern 2: Try with query parameters
      const fullUrl = url.pathname + url.search;
      pathMatch = fullUrl.match(/\/o\/([^?]+)/);
      if (pathMatch) {
        filePath = decodeURIComponent(pathMatch[1]);
      }
    }
    
    if (filePath) {
      console.log('deletePlayerPhoto: Extracted file path:', filePath);
      
      const photoRef = ref(storage, filePath);
      await deleteObject(photoRef);
      console.log('deletePlayerPhoto: Successfully deleted photo');
    } else {
      console.log('deletePlayerPhoto: Could not extract file path from URL');
      console.log('deletePlayerPhoto: Full URL breakdown:', {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      });
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    
    // Log more specific error information
    if (error.code === 'storage/object-not-found') {
      console.log('deletePlayerPhoto: Photo already deleted or does not exist');
    } else if (error.code === 'storage/unauthorized') {
      console.error('deletePlayerPhoto: Unauthorized to delete photo - check Firebase rules');
    } else {
      console.error('deletePlayerPhoto: Unknown error:', error.code, error.message);
    }
    
    // Don't throw error for deletion failures, as the main operation might still succeed
  }
};

/**
 * Compress and resize an image blob
 * @param {Blob} blob - The original image blob
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = async (blob, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(blob);
  });
};