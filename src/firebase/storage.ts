// src/firebase/storage.ts
import { ref, uploadBytes, getDownloadURL, deleteObject, StorageReference, UploadResult } from 'firebase/storage';
import { storage } from './config';
import type { Picture } from './database';

/**
 * Upload an image file to Firebase Storage for an estimate
 * @param file - The image file to upload
 * @param estimateId - The estimate ID
 * @param imageId - Unique image identifier
 * @returns Download URL of uploaded image
 */
export const uploadEstimateImage = async (file: File, estimateId: string, imageId: string): Promise<string> => {
  try {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${imageId}-${timestamp}.${fileExtension}`;

    // Create storage reference
    const storageRef: StorageReference = ref(storage, `estimates/${estimateId}/images/${fileName}`);

    // Upload file
    const snapshot: UploadResult = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The full download URL of the image to delete
 */
export const deleteEstimateImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    if (imageUrl.startsWith(baseUrl)) {
      const pathStart = imageUrl.indexOf('/o/') + 3;
      const pathEnd = imageUrl.indexOf('?');
      const encodedPath = imageUrl.substring(pathStart, pathEnd);
      const imagePath = decodeURIComponent(encodedPath);

      const storageRef: StorageReference = ref(storage, imagePath);
      await deleteObject(storageRef);
      console.log('Image deleted successfully');
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for deletion failures to avoid blocking the main operation
  }
};

/**
 * Upload multiple images for an estimate
 * @param pictures - Array of picture objects with file property
 * @param estimateId - The estimate ID
 * @returns Array of picture objects with URLs
 */
export const uploadEstimateImages = async (pictures: Picture[], estimateId: string): Promise<Picture[]> => {
  const uploadPromises = pictures.map(async (picture): Promise<Picture | null> => {
    // Check if picture has a File object and doesn't already have a http URL
    const pictureWithFile = picture as Picture & { file?: File };

    // Check if this is a new file that needs uploading
    // New files will have a blob URL (from URL.createObjectURL) or no URL
    const isNewFile = pictureWithFile.file && (!picture.url || picture.url.startsWith('blob:'));

    if (isNewFile && pictureWithFile.file) {
      // This is a new file that needs to be uploaded
      try {
        const downloadURL = await uploadEstimateImage(pictureWithFile.file, estimateId, picture.id);
        return {
          id: picture.id,
          url: downloadURL,
          description: picture.description
        };
      } catch (error) {
        console.error(`Failed to upload image ${picture.id}:`, error);
        return null; // Filter out failed uploads
      }
    } else if (picture.url && picture.url.startsWith('http')) {
      // This is an existing image with a URL (already uploaded to Firebase)
      return {
        id: picture.id,
        url: picture.url,
        description: picture.description
      };
    }
    return null;
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((result): result is Picture => result !== null);
};

/**
 * Upload a document file to Firebase Storage for an estimate
 * @param file - The document file to upload
 * @param estimateId - The estimate ID
 * @param documentId - Unique document identifier
 * @returns Download URL of uploaded document
 */
export const uploadEstimateDocument = async (file: File, estimateId: string, documentId: string): Promise<string> => {
  try {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${documentId}-${timestamp}.${fileExtension}`;

    // Create storage reference
    const storageRef: StorageReference = ref(storage, `estimates/${estimateId}/documents/${fileName}`);

    // Upload file
    const snapshot: UploadResult = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Document uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Delete a document from Firebase Storage
 * @param documentUrl - The full download URL of the document to delete
 */
export const deleteEstimateDocument = async (documentUrl: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    if (documentUrl.startsWith(baseUrl)) {
      const pathStart = documentUrl.indexOf('/o/') + 3;
      const pathEnd = documentUrl.indexOf('?');
      const encodedPath = documentUrl.substring(pathStart, pathEnd);
      const documentPath = decodeURIComponent(encodedPath);

      const storageRef: StorageReference = ref(storage, documentPath);
      await deleteObject(storageRef);
      console.log('Document deleted successfully');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    // Don't throw error for deletion failures to avoid blocking the main operation
  }
};

export interface Document {
  id: string;
  url: string;
  description: string;
  fileName?: string;
}

/**
 * Upload multiple documents for an estimate
 * @param documents - Array of document objects with file property
 * @param estimateId - The estimate ID
 * @returns Array of document objects with URLs
 */
export const uploadEstimateDocuments = async (documents: (Document & { file?: File })[], estimateId: string): Promise<Document[]> => {
  const uploadPromises = documents.map(async (document): Promise<Document | null> => {
    // Check if this is a new file that needs uploading
    // New files will have a blob URL (from URL.createObjectURL) or no URL
    const isNewFile = document.file && (!document.url || document.url.startsWith('blob:'));

    if (isNewFile && document.file) {
      // This is a new file that needs to be uploaded
      try {
        const downloadURL = await uploadEstimateDocument(document.file, estimateId, document.id);
        return {
          id: document.id,
          url: downloadURL,
          description: document.description,
          fileName: document.file.name
        };
      } catch (error) {
        console.error(`Failed to upload document ${document.id}:`, error);
        return null; // Filter out failed uploads
      }
    } else if (document.url && document.url.startsWith('http')) {
      // This is an existing document with a URL (already uploaded to Firebase)
      return {
        id: document.id,
        url: document.url,
        description: document.description,
        fileName: document.fileName
      };
    }
    return null;
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((result): result is Document => result !== null);
};

/**
 * Upload a file to a user's storage folder
 * @param userId - The user ID
 * @param file - The file to upload
 * @param folder - The subfolder within the user's directory (e.g., 'profile', 'logo')
 * @returns Download URL of uploaded file
 */
export const uploadUserFile = async (userId: string, file: File, folder: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}-${timestamp}.${fileExtension}`;

    // Create storage reference
    const storageRef: StorageReference = ref(storage, `users/${userId}/${folder}/${fileName}`);

    // Upload file
    const snapshot: UploadResult = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log(`User ${folder} uploaded successfully:`, downloadURL);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading user ${folder}:`, error);
    throw error;
  }
};

/**
 * Delete a file from user's storage folder
 * @param fileUrl - The full download URL of the file to delete
 */
export const deleteUserFile = async (fileUrl: string): Promise<void> => {
  try {
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    if (fileUrl.startsWith(baseUrl)) {
      const pathStart = fileUrl.indexOf('/o/') + 3;
      const pathEnd = fileUrl.indexOf('?');
      const encodedPath = fileUrl.substring(pathStart, pathEnd);
      const filePath = decodeURIComponent(encodedPath);

      const storageRef: StorageReference = ref(storage, filePath);
      await deleteObject(storageRef);
      console.log('User file deleted successfully');
    }
  } catch (error) {
    console.error('Error deleting user file:', error);
  }
};