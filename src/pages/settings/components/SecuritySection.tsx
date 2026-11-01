import { useAuthContext } from '../../../contexts/AuthContext';
export default function SecuritySection() {
  const {login,signOut}=useAuthContext();
  return <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
    <h3 className="text-lg font-semibold">Sign-in security</h3>
    <p>Your identity provider manages your password and authentication methods. For a password reset, sign out and use the password recovery option on the sign-in page.</p>
    <button className="min-h-11 rounded-lg border px-4 py-2" onClick={()=>void signOut()}>Sign out</button>
    <button className="ml-2 min-h-11 rounded-lg border px-4 py-2" onClick={login}>Open sign-in</button>
  </section>;
}
