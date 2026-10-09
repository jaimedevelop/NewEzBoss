import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { estimateSearchSessionKey, readEstimateSearchSession, writeEstimateSearchSession } from '../pages/estimates/estimateSearchSession';

export function useEstimateListSearch(): [string, (value: string) => void] {
  const { currentUser } = useAuthContext();
  const key = estimateSearchSessionKey(currentUser?.uid ?? 'anonymous');
  const [saved, setSaved] = useState(() => ({ key, value: readEstimateSearchSession(key) }));
  const searchTerm = saved.key === key ? saved.value : readEstimateSearchSession(key);

  const setSearchTerm = (value: string) => {
    writeEstimateSearchSession(key, value);
    setSaved({ key, value });
  };

  return [searchTerm, setSearchTerm];
}
