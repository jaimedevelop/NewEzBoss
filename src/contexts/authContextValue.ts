import { createContext } from 'react';
import type { AuthContextType } from './AuthContext';

// Keep the context identity stable when Vite refreshes the auth components or hooks.
export const authContext = createContext<AuthContextType | undefined>(undefined);
