// src/mobile/inventory/detailView/products/ProductDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProduct, type InventoryProduct } from '../../../../services/inventory/products';
import MobileDetailView from '../../MobileDetailView';
import MobileGeneralTab from './MobileGeneralTab';
import MobileSkuTab from './MobileSkuTab';
import MobilePriceTab from './MobilePriceTab';
import MobileStockTab from './MobileStockTab';
import MobileImageTab from './MobileImageTab';
import MobileHistoryTab from './MobileHistoryTab';
import { ProductCreationProvider } from '../../../../contexts/ProductCreationContext';

const ProductDetailPageInner: React.FC<{ product: InventoryProduct }> = ({ product }) => {
    const stockBadge = (): { label: string; color: 'green' | 'yellow' | 'red' } => {
        if (product.onHand === 0) return { label: 'Out of Stock', color: 'red' };
        if (product.onHand <= product.minStock) return { label: 'Low Stock', color: 'yellow' };
        return { label: 'In Stock', color: 'green' };
    };

    const tabs = [
        { id: 'general', label: 'General', content: <MobileGeneralTab /> },
        { id: 'sku', label: 'SKU', content: <MobileSkuTab /> },
        { id: 'price', label: 'Price', content: <MobilePriceTab /> },
        { id: 'stock', label: 'Stock', content: <MobileStockTab /> },
        { id: 'image', label: 'Image', content: <MobileImageTab /> },
        { id: 'history', label: 'History', content: <MobileHistoryTab /> },
    ];

    return (
        <MobileDetailView
            title={product.name}
            subtitle={[product.trade, product.section, product.category].filter(Boolean).join(' › ')}
            imageUrl={product.imageUrl}
            badge={stockBadge()}
            backPath="/products"
            tabs={tabs}
            defaultTab="general"
        />
    );
};

const toFormData = (p: InventoryProduct) => ({
    ...p,
    priceEntries: (p.priceEntries ?? []).map(e => ({
        id: e.id,
        store: e.store,
        price: String(e.price ?? ''),
    })),
});

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<InventoryProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) { setError('No product ID provided'); setLoading(false); return; }
        const load = async () => {
            const result = await getProduct(id);
            if (result.success) {
                setProduct(result.data);
            } else {
                setError('Product not found');
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading || error || !product) {
        return (
            <MobileDetailView
                title="Product"
                loading={loading}
                error={error}
                backPath="/products"
                sections={[]}
            />
        );
    }

    return (
        <ProductCreationProvider initialProduct={toFormData(product)}>
            <ProductDetailPageInner product={product} />
        </ProductCreationProvider>
    );
};

export default ProductDetailPage;