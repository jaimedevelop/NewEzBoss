import { Link } from 'react-router-dom';
export default function AccountDeletionHelp() {
  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-gray-900">
    <h1 className="text-3xl font-bold">Request account deletion</h1>
    <p>You can submit and track a deletion request in EzBoss on the web, iPhone or Android.</p>
    <ol className="list-decimal space-y-3 pl-6">
      <li>Sign in to the account you want to delete.</li>
      <li>Open Account requests and terms: under Settings on the web and Android, or Account on the iPhone dashboard.</li>
      <li>Type REQUEST DELETION and submit your request for review.</li>
      <li>Return to the same screen to see its status, review messages or cancel an open request.</li>
    </ol>
    <p>Submitting a request preserves your business records during review. Company owners must resolve ownership or company closure before erasure. Submitting a request does not automatically close a company or cancel a store subscription.</p>
    <p>Retention details will be provided through the reviewed policy and request process. No erasure deadline is promised on this page.</p>
    <Link to="/account-requests" className="inline-block min-h-11 rounded-lg bg-orange-600 px-4 py-3 text-white">Open account requests</Link>
    <p>If you cannot sign in, use password recovery on the sign-in page before opening your request.</p>
    <Link to="/landing/login" className="underline">Sign in</Link>
  </main>;
}
