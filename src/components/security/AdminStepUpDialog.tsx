import { useEffect, useState } from 'react';
import { installAdminStepUpPresenter } from '../../services/security/adminStepUp';

type Prompt = { action: () => Promise<string>; resolve: (token: string) => void; reject: (error: Error) => void };
export function AdminStepUpDialog() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current: Prompt | undefined;
    const uninstall = installAdminStepUpPresenter(action => new Promise((resolve, reject) => {
      current = { action, resolve, reject }; setPrompt(current);
    }));
    return () => { uninstall(); current?.reject(new Error('Verification was interrupted. The action was not retried.')); };
  }, []);
  if (!prompt) return null;
  const cancel = () => { prompt.reject(new Error('Verification cancelled. The action was not retried.')); setPrompt(null); };
  const verify = () => {
    setBusy(true);
    // Invoke immediately inside the click, before any await, to open the popup.
    void prompt.action().then(prompt.resolve, () => prompt.reject(new Error('Verification did not complete. The action was not retried.')))
      .finally(() => { setBusy(false); setPrompt(null); });
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="admin-verification-title" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
    <section className="max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h2 id="admin-verification-title" className="text-xl font-bold">Verify administrator access</h2>
      <p className="my-4">Complete fresh phishing-resistant authentication to continue your pending action.</p>
      <button onClick={verify} disabled={busy} className="mr-3 rounded bg-orange-600 px-4 py-2 text-white">{busy ? 'Verifying…' : 'Verify and continue'}</button>
      <button onClick={cancel} disabled={busy}>Cancel</button>
    </section>
  </div>;
}
