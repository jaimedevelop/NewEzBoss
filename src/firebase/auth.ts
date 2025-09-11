// src/firebase/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  User,
  UserCredential,
  Unsubscribe
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile } from './database';

// Types
export interface UserData {
  displayName?: string;
  email?: string;
  role?: string;
  companyName?: string;
  businessType?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  onboardingCompleted?: boolean;
  profileCompleted?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// Sign up new user
export const signUp = async (
  email: string, 
  password: string, 
  userData: UserData = {}
): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name if provided
    if (userData.displayName) {
      await updateProfile(user, {
        displayName: userData.displayName,
      });
    }

    // Create user profile in Firestore
    await createUserProfile(user.uid, {
      email: user.email,
      displayName: userData.displayName || '',
      role: 'admin', // Default role for MVP
      createdAt: new Date().toISOString(),
      isActive: true,
      ...userData,
    });

    // Send email verification
    await sendEmailVerification(user);

    return {
      success: true,
      user,
      message: 'Account created successfully. Please check your email for verification.',
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error.code,
      message: getErrorMessage(error.code),
    };
  }
};

// Sign in existing user
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user,
      message: 'Signed in successfully',
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error.code,
      message: getErrorMessage(error.code),
    };
  }
};

// Sign out user
export const signOutUser = async (): Promise<AuthResult> => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Failed to sign out',
    };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<AuthResult> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error.code,
      message: getErrorMessage(error.code),
    };
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Helper function to convert Firebase error codes to user-friendly messages
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    default:
      return 'An error occurred. Please try again.';
  }
};