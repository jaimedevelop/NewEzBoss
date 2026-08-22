// src/services/estimates/estimates.files.ts
//
// Upload/delete estimate photos and documents via ezboss-api, which stores
// them in Cloudflare R2 (S3-compatible object storage) and persists metadata
// in the "estimateFiles" table. Replaces the old Firebase Storage-backed
// src/firebase/storage.ts estimate helpers — function names/signatures are
// kept identical so callers only need an import path change.
import { getApiAccessToken } from '../apiAuth';
import type { Picture, EstimateDocument as Document } from './estimates.types';

const API_URL = import.meta.env.VITE_API_URL as string;

async function uploadFiles(
  estimateId: string,
  kind: 'images' | 'documents',
  files: File[]
): Promise<{ id: string; url: string; fileName?: string }[]> {
  if (files.length === 0) return [];

  const accessToken = await getApiAccessToken();
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const response = await fetch(`${API_URL}/estimates/${estimateId}/${kind}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Intentionally no Content-Type header — the browser sets
      // multipart/form-data with the correct boundary automatically.
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed: ${response.status}`);
  }

  return response.json();
}

async function deleteFile(estimateId: string, kind: 'images' | 'documents', url: string): Promise<void> {
  try {
    const accessToken = await getApiAccessToken();
    const response = await fetch(`${API_URL}/estimates/${estimateId}/${kind}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    if (!response.ok && response.status !== 404) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Delete failed: ${response.status}`);
    }
  } catch (error) {
    // Mirror the old Firebase behavior: don't block the main operation
    // (e.g. saving the estimate) if deleting the underlying file fails.
    console.error(`Failed to delete ${kind === 'images' ? 'image' : 'document'} from storage:`, error);
  }
}

/**
 * Upload multiple images for an estimate.
 * Skips entries that already have an http(s) URL (already uploaded); only
 * uploads entries with a File attached and a blob:/missing URL.
 */
export const uploadEstimateImages = async (
  pictures: (Picture & { file?: File | null })[],
  estimateId: string
): Promise<Picture[]> => {
  const toUpload = pictures.filter(
    (p) => p.file && (!p.url || p.url.startsWith('blob:'))
  );
  const alreadyUploaded = pictures.filter(
    (p) => !p.file && p.url && p.url.startsWith('http')
  );

  let uploaded: Picture[] = [];
  if (toUpload.length > 0) {
    const files = toUpload.map((p) => p.file as File);
    const results = await uploadFiles(estimateId, 'images', files);
    uploaded = results.map((r, i) => ({
      id: r.id,
      url: r.url,
      description: toUpload[i].description,
    }));
  }

  return [
    ...alreadyUploaded.map((p) => ({ id: p.id, url: p.url, description: p.description })),
    ...uploaded,
  ];
};

/**
 * Delete a single estimate image from storage.
 * Requires the estimateId since the backend scopes deletes to an estimate
 * for ownership enforcement.
 */
export const deleteEstimateImage = async (imageUrl: string, estimateId: string): Promise<void> => {
  await deleteFile(estimateId, 'images', imageUrl);
};

/**
 * Upload multiple documents for an estimate.
 * Skips entries that already have an http(s) URL (already uploaded); only
 * uploads entries with a File attached and a blob:/missing URL.
 */
export const uploadEstimateDocuments = async (
  documents: (Document & { file?: File })[],
  estimateId: string
): Promise<Document[]> => {
  const toUpload = documents.filter(
    (d) => d.file && (!d.url || d.url.startsWith('blob:'))
  );
  const alreadyUploaded = documents.filter(
    (d) => !d.file && d.url && d.url.startsWith('http')
  );

  let uploaded: Document[] = [];
  if (toUpload.length > 0) {
    const files = toUpload.map((d) => d.file as File);
    const results = await uploadFiles(estimateId, 'documents', files);
    uploaded = results.map((r, i) => ({
      id: r.id,
      url: r.url,
      description: toUpload[i].description,
      fileName: r.fileName ?? toUpload[i].file?.name,
    }));
  }

  return [
    ...alreadyUploaded.map((d) => ({ id: d.id, url: d.url, description: d.description, fileName: d.fileName })),
    ...uploaded,
  ];
};

/**
 * Delete a single estimate document from storage.
 * Requires the estimateId since the backend scopes deletes to an estimate
 * for ownership enforcement.
 */
export const deleteEstimateDocument = async (documentUrl: string, estimateId: string): Promise<void> => {
  await deleteFile(estimateId, 'documents', documentUrl);
};

export type { Document };
