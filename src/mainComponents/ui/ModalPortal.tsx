import React from 'react';
import { createPortal } from 'react-dom';

/** Mounts modal chrome outside scrollable page/layout containers. */
export const ModalPortal: React.FC<React.PropsWithChildren> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<div data-bug-modal style={{ display: 'contents' }}>{children}</div>, document.body);
};

export default ModalPortal;
