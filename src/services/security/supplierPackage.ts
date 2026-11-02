export interface SupplierData { supplier: string; sku: string; price: string }
export interface SupplierPackage { suppliers: SupplierData[]; selectedImage: string | null; timestamp: number }

export function parseSupplierPackage(value: unknown): SupplierPackage | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.suppliers) || v.suppliers.length < 1 || v.suppliers.length > 50 ||
      typeof v.timestamp !== 'number' || !Number.isFinite(v.timestamp) ||
      Math.abs(Date.now() - v.timestamp) > 24 * 60 * 60 * 1000) return null;
  const suppliers: SupplierData[] = [];
  for (const raw of v.suppliers) {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    if (typeof s.supplier !== 'string' || !s.supplier.trim() || s.supplier.length > 100 ||
        typeof s.sku !== 'string' || s.sku.length > 200 ||
        typeof s.price !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(s.price)) return null;
    suppliers.push({ supplier: s.supplier.trim(), sku: s.sku, price: s.price });
  }
  let selectedImage: string | null = null;
  if (v.selectedImage !== null && v.selectedImage !== undefined) {
    if (typeof v.selectedImage !== 'string' || v.selectedImage.length > 2048) return null;
    try {
      const url = new URL(v.selectedImage);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      selectedImage = url.href;
    } catch { return null; }
  }
  return { suppliers, selectedImage, timestamp: v.timestamp };
}
