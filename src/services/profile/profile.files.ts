// src/services/profile/profile.files.ts
//
// Upload the user's profile picture / company logo via ezboss-api, which
// stores them in Cloudflare R2 (S3-compatible object storage) and updates
// the contractor_profiles row. Replaces the old Firebase Storage-backed
// uploadUserFile() in src/firebase/storage.ts.
import { getApiAccessToken } from '../apiAuth';
import type { UserProfile } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL as string;

async function uploadProfileImage(kind: 'picture' | 'logo', file: File): Promise<UserProfile> {
  const accessToken = await getApiAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/profile/${kind}`, {
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

export const uploadProfilePicture = (file: File): Promise<UserProfile> => uploadProfileImage('picture', file);

export const uploadCompanyLogo = (file: File): Promise<UserProfile> => uploadProfileImage('logo', file);
