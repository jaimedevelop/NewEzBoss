// src/mainComponents/ui/ProfileSquare.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

const ProfileSquare: React.FC = () => {
  const navigate = useNavigate();
  const { myPermissions } = useAuthContext();

  const name = myPermissions?.displayName || '';
  const email = myPermissions?.email || '';

  return (
    <button
      onClick={() => navigate('/settings')}
      className="w-full flex flex-col items-center gap-2 px-4 py-4 hover:bg-slate-800 transition-colors duration-200"
    >
      <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
        <User className="h-8 w-8 text-gray-400" />
      </div>
      <div className="w-full text-center min-w-0">
        {name && <p className="text-sm font-bold text-white truncate">{name}</p>}
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>
    </button>
  );
};

export default ProfileSquare;
