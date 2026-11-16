import { useEffect, useState } from 'react';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { authClient, authRequest, readCookieSession } from '../../services/authClient';
import { createCookieSessionHandle, setCookieSignOutBarrier } from '../../services/authMode';

const path = '/auth/migrate-google';
const api = import.meta.env.VITE_API_URL as string;

export default function GoogleMigration() {
  const params = new URLSearchParams(window.location.search);
  const returning = params.has('complete') && !params.has('error');
  const [enabled, setEnabled] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.has('error') ? 'Google sign-in could not finish. Choose an eligible Google account and try again.' : '');
  const [complete, setComplete] = useState(false);
  const [confirmedSession, setConfirmedSession] = useState<{ email: string; subject: string; sessionId: string }>();

  useEffect(() => {
    let active = true;
    authRequest('/ezboss/config').then(config => {
      if (active) setEnabled(config?.googleMigrationEnabled === true);
    }).catch(() => {
      if (active) setError('Migration is temporarily unavailable. Reload to try again.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!returning || !enabled) return;
    let active = true;
    readCookieSession().then(session => {
      if (!active) return;
      if (session?.user.email) setConfirmedSession({ email: session.user.email, subject: session.user.id, sessionId: session.session.id });
      else setError('Choose your Google account again to continue.');
    }).catch(() => {
      if (active) setError('Could not verify the Google session. Choose your Google account again.');
    });
    return () => { active = false; };
  }, [returning, enabled]);

  async function signIn() {
    setError('');
    setBusy(true);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        requestSignUp: true,
        callbackURL: window.location.origin + path + '?complete=1',
        errorCallbackURL: window.location.origin + path + '?error=1',
      });
      if (result.error || !result.data?.redirect) throw new Error();
    } catch {
      setError('Could not start Google sign-in. Try again.');
      setBusy(false);
    }
  }

  async function finish() {
    setError('');
    setBusy(true);
    try {
      const session = await readCookieSession();
      if (!session || !confirmedSession || session.user.id !== confirmedSession.subject || session.session.id !== confirmedSession.sessionId) {
        throw new Error('Choose your Google account again to continue.');
      }
      setCookieSignOutBarrier(false);
      const token = createCookieSessionHandle(session.user.id, session.session.id);
      const response = await fetch(api + '/account/google-migration', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 409) throw new Error('This Google account could not be matched to an eligible EzBoss account.');
      if (response.status !== 204) throw new Error('EzBoss could not finish the migration. Try again.');
      window.history.replaceState({}, '', path);
      setComplete(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'EzBoss could not finish the migration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Move your EzBoss sign-in" subtitle="Use the Google account you already use for EzBoss." showBackToHome={false}>
      <div className="ez-identity-form" aria-busy={busy}>
        {error && <p role="alert">{error}</p>}
        {enabled === false && <p role="status">Google account migration is closed.</p>}
        {enabled === undefined && !error && <p role="status">Checking migration availability…</p>}
        {complete ? <>
          <p role="status">Your Google sign-in is linked to your existing EzBoss account.</p>
          <a className="ez-auth-primary" href="/">Open EzBoss</a>
          <button type="button" onClick={() => void signIn()} disabled={busy}>Migrate another Google account</button>
        </> : enabled && <>
          {returning && confirmedSession && <>
            <p>Signed in as <strong>{confirmedSession.email}</strong></p>
            <button type="button" className="ez-auth-primary" disabled={busy} onClick={() => void finish()}>
              Link my EzBoss account
            </button>
          </>}
          <button type="button" className={returning ? 'ez-identity-link' : 'ez-auth-primary'} disabled={busy} onClick={() => void signIn()}>
            {returning ? 'Choose another Google account' : 'Continue with Google'}
          </button>
        </>}
      </div>
    </AuthLayout>
  );
}
