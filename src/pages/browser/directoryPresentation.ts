export const DIRECTORY_CATEGORIES = [
  { slug: 'construction', name: 'Construction', gradient: 'from-orange-700 to-amber-700', accent: 'bg-orange-50 text-orange-800' },
  { slug: 'beauty', name: 'Beauty', gradient: 'from-fuchsia-700 to-pink-700', accent: 'bg-pink-50 text-pink-800' },
  { slug: 'car-mechanic', name: 'Car Mechanic', gradient: 'from-blue-700 to-indigo-700', accent: 'bg-blue-50 text-blue-800' },
  { slug: 'dental', name: 'Dental', gradient: 'from-teal-700 to-cyan-800', accent: 'bg-teal-50 text-teal-800' },
] as const;

export function companyInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'EB';
}
export function industryName(slug: string) {
  return DIRECTORY_CATEGORIES.find(category => category.slug === slug)?.name || slug;
}
export function safeWebsite(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function browserReturnPath(value: unknown) {
  if (typeof value !== 'string') return '/browser';
  return value === '/browser' || value.startsWith('/browser?') ? value : '/browser';
}
