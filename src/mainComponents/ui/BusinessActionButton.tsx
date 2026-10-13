import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { capability: string; requires?: string[] };
/** The API independently enforces the same action. Re-evaluates on policy refresh. */
export default function BusinessActionButton({ capability, requires = [], disabled, ...props }: Props) {
  const { canPerform } = useAuthContext();
  const denied = ![capability, ...requires].every(canPerform);
  return <button {...props} disabled={disabled || denied} aria-disabled={disabled || denied}
    title={denied ? 'Your company permissions do not allow this action' : props.title} />;
}
