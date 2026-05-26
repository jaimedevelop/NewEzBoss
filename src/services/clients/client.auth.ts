import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { type Estimate } from '../estimates/estimates.types';

export interface ClientUser {
  uid: string;
  email: string;
  name: string;
  contractorUserId: string; // The contractor who owns this client's estimates
  createdAt: Date;
}

export interface CreateClientAccountParams {
  email: string;
  name: string;
  contractorUserId: string;
  temporaryPassword: string;
}

/**
 * Creates a Firebase Auth account for a client and stores their profile
 * in the `clientUsers` collection. Safe to call multiple times — if the
 * account already exists it returns null without throwing.
 */
export const createClientAccount = async ({
  email,
  name,
  contractorUserId,
  temporaryPassword
}: CreateClientAccountParams): Promise<string | null> => {
  try {
    let uid: string;

    try {
      const credential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        temporaryPassword
      );
      uid = credential.user.uid;
    } catch (err: any) {
      // Account already exists — still ensure Firestore doc exists
      if (err.code === 'auth/email-already-in-use') {
        const existing = await getClientUserByEmail(email);
        return existing?.uid ?? null;
      }
      throw err;
    }

    await setDoc(doc(db, 'clientUsers', uid), {
      uid,
      email,
      name,
      contractorUserId,
      createdAt: serverTimestamp(),
      mustResetPassword: true
    });

    return uid;
  } catch (err) {
    console.error('Error creating client account:', err);
    throw new Error('Failed to create client account');
  }
};

export const signInClient = async (
  email: string,
  password: string
): Promise<ClientUser> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getClientUserByUid(credential.user.uid);

    if (!profile) {
      await signOut(auth);
      throw new Error('No client profile found for this account.');
    }

    return profile;
  } catch (err: any) {
    if (
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid email or password.');
    }
    throw err;
  }
};

export const signOutClient = async (): Promise<void> => {
  await signOut(auth);
};

export const getClientUserByUid = async (uid: string): Promise<ClientUser | null> => {
  try {
    const snap = await getDoc(doc(db, 'clientUsers', uid));
    if (!snap.exists()) return null;
    return snap.data() as ClientUser;
  } catch (err) {
    console.error('Error fetching client user:', err);
    return null;
  }
};

export const getClientUserByEmail = async (email: string): Promise<ClientUser | null> => {
  try {
    const q = query(collection(db, 'clientUsers'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as ClientUser;
  } catch (err) {
    console.error('Error fetching client user by email:', err);
    return null;
  }
};

/**
 * Returns all estimates where customerEmail matches the client's email,
 * scoped to the contractor who owns them.
 */
export const getClientEstimates = async (
  clientEmail: string,
  contractorUserId: string
): Promise<(Estimate & { id: string })[]> => {
  try {
    const q = query(
      collection(db, 'estimates'),
      where('customerEmail', '==', clientEmail),
      where('userId', '==', contractorUserId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Estimate & { id: string }));
  } catch (err) {
    console.error('Error fetching client estimates:', err);
    throw new Error('Failed to load estimates');
  }
};