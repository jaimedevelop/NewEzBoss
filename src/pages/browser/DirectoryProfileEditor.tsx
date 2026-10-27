import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  DirectoryIndustry, DirectoryProfile, getDirectoryIndustries,
  getDirectoryProfile, saveDirectoryProfile,
} from '../../services/directory';

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100';

const DirectoryProfileEditor: React.FC = () => {
  const { membershipId } = useAuthContext();
  const [profile, setProfile] = useState<DirectoryProfile | null>(null);
  const [industries, setIndustries] = useState<DirectoryIndustry[]>([]);
  const [trades, setTrades] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    setSaving(false);
    setProfile(null);
    setError('');
    setMessage('');
    Promise.all([getDirectoryProfile(), getDirectoryIndustries()])
      .then(([value, catalog]) => {
        if (generation.current !== current) return;
        setProfile(value);
        setTrades(value.trades.join('\n'));
        setIndustries(catalog.industries);
      })
      .catch((reason: unknown) => {
        if (generation.current === current) setError(reason instanceof Error ? reason.message : 'Unable to load your directory profile.');
      })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current = current + 1; };
  }, [membershipId, retry]);

  const update = (patch: Partial<DirectoryProfile>) => {
    setProfile(previous => previous ? { ...previous, ...patch } : previous);
    setMessage('');
    setError('');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || saving) return;
    const normalizedTrades = [...new Set(trades.split(/[,\n]/).map(value => value.trim()).filter(Boolean))];
    if (normalizedTrades.length > 30 || normalizedTrades.some(value => value.length > 100)) {
      setError('Add up to 30 trades, with no more than 100 characters per trade.');
      return;
    }
    if (profile.published && (!profile.displayName.trim() || profile.industries.length === 0)) {
      setError('Choose at least one category and enter a company name before publishing.');
      return;
    }
    const current = generation.current;
    setSaving(true);
    setError('');
    setMessage('');
    const body = {
      displayName: profile.displayName,
      description: profile.description,
      industries: profile.industries,
      services: profile.services,
      serviceArea: profile.serviceArea,
      publicEmail: profile.publicEmail,
      publicPhone: profile.publicPhone,
      website: profile.website,
      published: profile.published,
    };
    try {
      const saved = await saveDirectoryProfile({ ...body, trades: normalizedTrades });
      if (generation.current !== current) return;
      setProfile(saved);
      setTrades(saved.trades.join('\n'));
      setMessage(saved.published ? 'Directory profile saved and published in Browser.' : 'Draft saved. Your company is hidden from Browser.');
    } catch (reason) {
      if (generation.current === current) setError(reason instanceof Error ? reason.message : 'Unable to save your directory profile. Please try again.');
    } finally {
      if (generation.current === current) setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-6 text-gray-600" role="status"><Loader2 className="h-5 w-5 animate-spin" />Loading directory profile…</div>;
  if (!profile) return <div className="rounded-xl border border-red-100 bg-white p-6"><p role="alert" className="text-sm text-red-700">{error || 'Directory profile unavailable.'}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 text-sm font-medium text-orange-700 underline">Try again</button></div>;

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="directory-profile-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="directory-profile-heading" className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Building2 className="h-5 w-5 text-orange-600" />Browser company profile</h3><p className="mt-1 max-w-2xl text-sm text-gray-600">Choose the company details and services people can find in Browser. These fields are separate from your private account and business settings.</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${profile.published ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{profile.published ? 'Publication selected' : 'Draft selected'}</span>
      </div>
      <form onSubmit={save} className="mt-6 space-y-6">
        <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">Publishing makes the details below visible to people browsing EzBoss. Enter only business contact information you want to share. Saving with publication turned off hides the profile.</div>
          <label className="block text-sm font-medium text-gray-700">Company display name<input className={inputClass} maxLength={160} value={profile.displayName} required={profile.published} onChange={event => update({ displayName: event.target.value })} /></label>
          <label className="block text-sm font-medium text-gray-700">About your company<textarea className={inputClass} rows={4} maxLength={3000} value={profile.description} onChange={event => update({ description: event.target.value })} /></label>
          <fieldset><legend className="text-sm font-medium text-gray-700">Categories</legend><p className="mt-1 text-xs text-gray-500">Select at least one category to publish.</p><div className="mt-3 flex flex-wrap gap-3">{industries.map(industry => <label key={industry.slug} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"><input type="checkbox" checked={profile.industries.includes(industry.slug)} onChange={event => update({ industries: event.target.checked ? [...profile.industries, industry.slug] : profile.industries.filter(value => value !== industry.slug) })} className="accent-orange-600" />{industry.name}</label>)}</div></fieldset>
          <label className="block text-sm font-medium text-gray-700">Trades<textarea className={inputClass} rows={3} value={trades} onChange={event => { setTrades(event.target.value); setMessage(''); setError(''); }} aria-describedby="directory-trades-help" /><span id="directory-trades-help" className="mt-1 block text-xs font-normal text-gray-500">One trade per line, or separate with commas. Include terms customers search for, such as Plumbing. Up to 30 trades.</span></label>
          <div className="space-y-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-gray-900">Services</h4><button type="button" disabled={profile.services.length >= 50} onClick={() => update({ services: [...profile.services, { name: '', description: '', published: true }] })} className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 disabled:opacity-50"><Plus className="h-4 w-4" />Add service</button></div>{profile.services.length === 0 && <p className="text-sm text-gray-500">Add services to help customers understand what you offer.</p>}{profile.services.map((service, index) => <div key={index} className="space-y-3 rounded-lg border border-gray-200 p-4"><div className="flex items-start gap-3"><label className="min-w-0 flex-1 text-sm font-medium text-gray-700">Service name<input required className={inputClass} value={service.name} maxLength={160} onChange={event => update({ services: profile.services.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} /></label><button type="button" aria-label={`Remove service ${index + 1}`} onClick={() => update({ services: profile.services.filter((_, position) => position !== index) })} className="mt-7 rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div><label className="block text-sm font-medium text-gray-700">Service description<textarea className={inputClass} rows={2} value={service.description} maxLength={1000} onChange={event => update({ services: profile.services.map((item, position) => position === index ? { ...item, description: event.target.value } : item) })} /></label><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={service.published} onChange={event => update({ services: profile.services.map((item, position) => position === index ? { ...item, published: event.target.checked } : item) })} className="accent-orange-600" />Show this service when the company profile is published</label></div>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">Public service area<input className={inputClass} maxLength={300} placeholder="For example, Miami-Dade County" value={profile.serviceArea} onChange={event => update({ serviceArea: event.target.value })} /></label>
            <label className="block text-sm font-medium text-gray-700">Public business email<input className={inputClass} type="email" maxLength={254} value={profile.publicEmail} onChange={event => update({ publicEmail: event.target.value })} /></label>
            <label className="block text-sm font-medium text-gray-700">Public business phone<input className={inputClass} type="tel" maxLength={50} value={profile.publicPhone} onChange={event => update({ publicPhone: event.target.value })} /></label>
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">Public website<input className={inputClass} type="url" pattern="https?://.+" placeholder="https://example.com" maxLength={500} value={profile.website} onChange={event => update({ website: event.target.value })} /><span className="mt-1 block text-xs font-normal text-gray-500">Use an https:// or http:// address.</span></label>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4"><input type="checkbox" checked={profile.published} onChange={event => update({ published: event.target.checked })} className="mt-1 accent-orange-600" /><span className="text-sm text-gray-700"><strong className="block text-gray-900">Publish company profile in Browser</strong>I have reviewed these details and want to make them visible. Changes take effect when saved.</span></label>
          <div className="flex flex-wrap gap-3"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Save directory profile'}</button><button type="button" onClick={() => setPreview(value => !value)} aria-expanded={preview} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"><Eye className="h-4 w-4" />{preview ? 'Hide preview' : 'Preview details'}</button></div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="flex items-center gap-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      </form>
      {preview && <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Unsaved details preview</p><h4 className="text-xl font-semibold text-gray-900">{profile.displayName || 'Your company name'}</h4><p className="text-sm text-gray-600">{industries.filter(industry => profile.industries.includes(industry.slug)).map(industry => industry.name).join(' · ')}</p><p className="whitespace-pre-wrap text-sm text-gray-700">{profile.description}</p><p className="whitespace-pre-wrap text-sm text-gray-600">{trades}</p>{profile.serviceArea && <p className="text-sm text-gray-600">Service area: {profile.serviceArea}</p>}<div className="space-y-3">{profile.services.filter(service => service.published).map((service, index) => <div key={index}><h5 className="font-medium text-gray-900">{service.name || 'Service name'}</h5><p className="whitespace-pre-wrap text-sm text-gray-600">{service.description}</p></div>)}</div><div className="space-y-1 break-words text-sm text-gray-600">{profile.publicEmail && <p>{profile.publicEmail}</p>}{profile.publicPhone && <p>{profile.publicPhone}</p>}{profile.website && <p>{profile.website}</p>}</div><p className="text-xs text-gray-500">Preview only. Your changes appear in Browser after saving with publication enabled.</p></div>}
    </section>
  );
};

export default DirectoryProfileEditor;
