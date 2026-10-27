import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, ChevronLeft, ChevronRight, HeartPulse, HardHat, MapPin, Search, Sparkles, Wrench } from 'lucide-react';
import { searchDirectoryCompanies, type DirectorySearchResults } from '../../services/directory';
import { useAuthContext } from '../../contexts/AuthContext';
import { DIRECTORY_CATEGORIES, companyInitials, industryName } from './directoryPresentation';
const categoryIcons = [HardHat, Sparkles, Wrench, HeartPulse];
const PAGE_SIZE = 12;
export default function Browser() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { membershipId, currentUser } = useAuthContext();
  const query = (params.get('q') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const industry = params.get('industry') || '';
  const rawPage = Number(params.get('page') || '1');
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<DirectorySearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const validIndustry = !industry || DIRECTORY_CATEGORIES.some(category => category.slug === industry);
  useEffect(() => { setInput(query); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError('');
    setResults(null);
    if(!validIndustry) {
      setError('This category is unavailable. Choose one of the categories above.');
      setLoading(false);
      return () => { current = false; controller.abort(); };
    }
    searchDirectoryCompanies({ q: query, industry, page, pageSize: PAGE_SIZE }, controller.signal)
      .then(data => { if(current) setResults(data); })
      .catch(reason => { if(current) setError(reason instanceof Error ? reason.message : 'Unable to load companies. Please try again.'); })
      .finally(() => { if(current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [query, industry, page, retry, validIndustry, membershipId, currentUser?.uid]);
  function updateSearch(values: { q?: string; industry?: string; page?: number }) {
    const next = new URLSearchParams(params);
    for(const [key, value] of Object.entries(values)) {
      if(!value || (key === 'page' && value === 1)) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next);
  }
  const returnTo = `${location.pathname}${location.search}`;
  const totalPages = results ? Math.ceil(results.total / results.pageSize) : 0;
  return <div className="mx-auto max-w-6xl space-y-8 pb-8">
    <div className="flex flex-wrap justify-end gap-4 text-sm font-semibold text-orange-700">
      <Link to="/marketplace">Client Browser</Link>
      <Link to="/marketplace/requests">My job requests</Link>
    </div>
    <section
      className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-10 text-center sm:px-10 sm:py-14"
    >
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-orange-800"
      >
        <Building2 size={14} aria-hidden="true" /> EZBOSS BROWSER
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Find the right company.</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">Explore companies and the services they offer, all in one place.</p>
      <form
        role="search"
        className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row"
        onSubmit={event => { event.preventDefault(); updateSearch({ q: input.trim().replace(/\s+/g, ' '), page: 1 }); }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-3">
          <Search className="shrink-0 text-slate-400" size={21} aria-hidden="true" />
          <label htmlFor="company-search" className="sr-only">Search company names, trades, or services</label>
          <input
            id="company-search"
            type="search"
            maxLength={120}
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Try Plumbing, a service, or a company"
            className="w-full min-w-0 rounded-lg bg-transparent py-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >Search</button>
      </form>
      <div className="mx-auto mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Company categories">
        {DIRECTORY_CATEGORIES.map((category, index) => {
          const Icon = categoryIcons[index];
          const selected = industry === category.slug;
          return <button
            key={category.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => updateSearch({ industry: selected ? '' : category.slug, q: input.trim().replace(/\s+/g, ' '), page: 1 })}
            className={`flex min-h-[108px] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${category.gradient} px-3 py-4 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 ${selected ? 'ring-2 ring-slate-700 ring-offset-4' : ''}`}
          >
            <Icon size={27} strokeWidth={1.7} aria-hidden="true" />
            <span className="text-sm font-semibold">{category.name}</span>
          </button>;
        })}
      </div>
    </section>

    <section aria-labelledby="directory-results-title" aria-busy={loading} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="directory-results-title" className="text-xl font-bold text-slate-900">
            {query ? `Results for “${query}”` : industry ? `${industryName(industry)} companies` : 'Explore companies'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {industry && query ? `${industryName(industry)} · ` : ''}Published company profiles on EzBoss
          </p>
        </div>
        {(query || industry) && <button
          type="button"
          onClick={() => { setInput(''); setParams({}); }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-orange-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
        >Clear filters</button>}
      </div>
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {loading ? 'Finding companies…' : !error && results ? `${results.total} ${results.total === 1 ? 'company' : 'companies'} found` : ''}
      </div>
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[1, 2, 3].map(item => <div key={item} className="h-56 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-12 w-12 rounded-xl bg-slate-100" />
          <div className="mt-5 h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
        </div>)}
      </div>
        : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-800">{error}</p>
          {validIndustry && <button
            type="button"
            className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
            onClick={() => setRetry(value => value + 1)}
          >Try again</button>}
        </div>
          : results && results.companies.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Building2 className="mx-auto text-slate-400" size={32} aria-hidden="true" />
            <h3 className="mt-3 text-lg font-semibold text-slate-800">
              {page > 1 ? 'No companies on this page' : query ? 'No companies found' : 'No published companies yet'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {page > 1 ? 'Return to the first page to see available companies.' : query ? 'Try another company name, trade, or service, or clear your filters.' : 'Companies will appear here when they publish their directory profiles.'}
            </p>
            {page > 1 && <button
              type="button"
              onClick={() => updateSearch({ page: 1 })}
              className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
            >Go to first page</button>}
          </div>
            : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results?.companies.map(company => <article
                key={company.slug}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 font-bold text-orange-800"
                    aria-hidden="true"
                  >
                    {companyInitials(company.displayName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-slate-900">
                      <Link
                        to={`/browser/company/${encodeURIComponent(company.slug)}`}
                        state={{ returnTo }}
                        className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
                      >{company.displayName}</Link>
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {company.industries.map(industryName).join(' · ')}
                    </p>
                  </div>
                </div>
                {company.description && <p className="mt-4 line-clamp-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{company.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...new Set([...company.trades, ...company.services.map(service => service.name)])].slice(0, 4).map(label => <span
                    key={label}
                    className="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                  >{label}</span>)}
                </div>
                {company.serviceArea && <p className="mt-4 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                  <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="break-words">{company.serviceArea}</span>
                </p>}
                <Link
                  to={`/browser/company/${encodeURIComponent(company.slug)}`}
                  state={{ returnTo }}
                  className="mt-auto flex items-center justify-between gap-2 rounded-lg pt-5 text-sm font-semibold text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
                >View company
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </article>)}
            </div>}
      {!loading && !error && results && totalPages > 1 && <nav aria-label="Company results pages" className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => updateSearch({ page: page - 1 })}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
        >
          <ChevronLeft size={16} aria-hidden="true" /> Previous
        </button>
        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => updateSearch({ page: page + 1 })}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
        >Next
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>}
    </section>
  </div>;
}
