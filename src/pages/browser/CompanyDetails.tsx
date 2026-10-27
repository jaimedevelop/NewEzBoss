import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { DirectoryApiError, getDirectoryCompany, type DirectoryPublicProfile } from '../../services/directory';
import { useAuthContext } from '../../contexts/AuthContext';
import { browserReturnPath, companyInitials, industryName, safeWebsite } from './directoryPresentation';
export default function CompanyDetails() {
  const { slug = '' } = useParams<{ slug: string }>();
  const location = useLocation();
  const { membershipId, currentUser } = useAuthContext();
  const returnTo = browserReturnPath(location.state?.returnTo);
  const [company, setCompany] = useState<DirectoryPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError('');
    setCompany(null);
    setNotFound(false);
    getDirectoryCompany(slug, controller.signal)
      .then(data => { if(current) setCompany(data); })
      .catch(reason => {
        if(!current) return;
        setNotFound(reason instanceof DirectoryApiError && reason.status === 404);
        setError(reason instanceof Error ? reason.message : 'Unable to load this company. Please try again.');
      })
      .finally(() => { if(current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [slug, retry, membershipId, currentUser?.uid]);
  const website = company ? safeWebsite(company.website) : null;
  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <Link
      to={returnTo}
      className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
    >
      <ArrowLeft size={18} aria-hidden="true" /> Back to companies
    </Link>
    {loading ? <div
      role="status"
      className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500"
    >Loading company…</div>
      : error ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <Building2 className="mx-auto text-slate-400" size={36} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {notFound ? 'Company unavailable' : 'Unable to load company'}
        </h1>
        <p role="alert" className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          {notFound ? 'This company profile may be unpublished or no longer available. Return to Browser to explore other companies.' : error}
        </p>
        {!notFound && <button
          type="button"
          onClick={() => setRetry(value => value + 1)}
          className="mt-5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >Try again</button>}
      </div>
        : company && <>
          <header
            className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 sm:p-9"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 text-2xl font-bold text-white shadow-sm"
              >
                {companyInitials(company.displayName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Company profile</p>
                <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900">{company.displayName}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.industries.map(industry => <span
                    key={industry}
                    className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-800"
                  >
                    {industryName(industry)}
                  </span>)}
                </div>
              </div>
            </div>
          </header>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">About {company.displayName}</h2>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                  {company.description || 'This company has not added a description yet.'}
                </p>
                {company.trades.length > 0 && <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-800">Trades & specialties</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {company.trades.map(trade => <span
                      key={trade}
                      className="max-w-full break-words rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                    >{trade}</span>)}
                  </div>
                </div>}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Services</h2>
                {company.services.length ? <ul className="mt-4 divide-y divide-slate-100">
                  {company.services.map((service, index) => <li key={`${service.name}-${index}`} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="break-words font-semibold text-slate-800">{service.name}</h3>
                    {service.description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{service.description}</p>}
                  </li>)}
                </ul> : <p className="mt-3 text-sm leading-6 text-slate-500">This company has not listed individual services yet.</p>}
              </section>
            </div>
            <aside
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
              aria-label="Company contact information"
            >
              <h2 className="text-lg font-bold text-slate-900">Company information</h2>
              {company.industries.includes('construction') && <Link
                to={`/marketplace/companies/${encodeURIComponent(company.slug)}/plan`}
                className="block rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3 text-center text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >Plan a construction job</Link>}
              {company.serviceArea && <div className="flex items-start gap-3">
                <MapPin size={19} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service area</h3>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-700">{company.serviceArea}</p>
                </div>
              </div>}
              {company.publicPhone && <div className="flex items-start gap-3">
                <Phone size={18} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</h3>
                  <a
                    href={`tel:${company.publicPhone.replace(/[^+\d]/g, '')}`}
                    className="mt-1 block break-words text-sm text-slate-700 underline decoration-slate-300 underline-offset-4"
                  >{company.publicPhone}</a>
                </div>
              </div>}
              {company.publicEmail && <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</h3>
                  <a
                    href={`mailto:${encodeURIComponent(company.publicEmail)}`}
                    className="mt-1 block break-all text-sm text-slate-700 underline decoration-slate-300 underline-offset-4"
                  >{company.publicEmail}</a>
                </div>
              </div>}
              {website && <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
              >Visit website
                <ExternalLink size={16} aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>}
              {!company.serviceArea && !company.publicEmail && !company.publicPhone && !website && <p className="text-sm leading-6 text-slate-500">This company has not published contact details yet.</p>}
              <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Details and services are provided by the company.</p>
            </aside>
          </div>
        </>}
  </div>;
}
