import React from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AutoSaveIndicator: React.FC<{ status: AutoSaveStatus }> = ({ status }) => {
  if (status === 'idle') return null;

  const config = {
    saving: { text: 'SAVING...', className: 'text-gray-400' },
    saved: { text: 'SAVED', className: 'text-green-600' },
    error: { text: 'ERROR SAVING', className: 'text-red-600' }
  }[status];

  return (
    <sub className={`ml-2 text-[10px] font-semibold tracking-wide align-middle ${config.className}`}>
      {config.text}
    </sub>
  );
};

export default AutoSaveIndicator;
