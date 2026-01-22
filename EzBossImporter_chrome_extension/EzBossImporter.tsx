import React, { useEffect, useState } from 'react';

interface ProductData {
  supplier: string;
  url: string;
  productName: string;
  brand: string;
  sku: string;
  price: string;
  description: string;
  category: string;
  subcategory: string;
  size: string;
  imageUrl: string;
  type: string;
  timestamp?: number;
}

interface EzBossImporterProps {
  onProductImport: (product: ProductData) => void;
}

const EzBossImporter: React.FC<EzBossImporterProps> = ({ onProductImport }) => {
  const [pendingProducts, setPendingProducts] = useState<ProductData[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check for pending products from Chrome extension
    const checkPendingProducts = () => {
      // This will be populated by the Chrome extension via localStorage or postMessage
      const storedProducts = localStorage.getItem('ezboss_pending_products');
      
      if (storedProducts) {
        try {
          const products = JSON.parse(storedProducts);
          setPendingProducts(products);
          setShowModal(true);
          localStorage.removeItem('ezboss_pending_products'); // Clear after reading
        } catch (error) {
          console.error('Error parsing pending products:', error);
        }
      }
    };

    // Check immediately
    checkPendingProducts();

    // Listen for messages from Chrome extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EZBOSS_IMPORT_PRODUCT') {
        const product = event.data.productData;
        setPendingProducts([product]);
        setShowModal(true);
      }
      
      if (event.data.type === 'EZBOSS_IMPORT_BULK') {
        const products = event.data.products;
        setPendingProducts(products);
        setShowModal(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Periodic check (in case extension sets localStorage while app is open)
    const interval = setInterval(checkPendingProducts, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const handleImport = (product: ProductData, index: number) => {
    onProductImport(product);
    setPendingProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportAll = () => {
    pendingProducts.forEach(product => onProductImport(product));
    setPendingProducts([]);
    setShowModal(false);
  };

  const handleDismiss = () => {
    setShowModal(false);
    setPendingProducts([]);
  };

  if (!showModal || pendingProducts.length === 0) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            📦 Import Products from Extension
          </h2>
          <button onClick={handleDismiss} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <p style={styles.subtitle}>
            Found {pendingProducts.length} product{pendingProducts.length !== 1 ? 's' : ''} ready to import
          </p>

          <div style={styles.productList}>
            {pendingProducts.map((product, index) => (
              <div key={index} style={styles.productCard}>
                {product.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.productName}
                    style={styles.productImage}
                  />
                )}
                <div style={styles.productInfo}>
                  <div style={styles.productName}>{product.productName}</div>
                  <div style={styles.productMeta}>
                    <span style={styles.supplier}>{product.supplier}</span>
                    {product.brand && <span style={styles.brand}>{product.brand}</span>}
                    {product.price && <span style={styles.price}>${product.price}</span>}
                  </div>
                  {product.sku && (
                    <div style={styles.sku}>SKU: {product.sku}</div>
                  )}
                </div>
                <button
                  onClick={() => handleImport(product, index)}
                  style={styles.importBtn}
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={handleDismiss} style={styles.dismissBtn}>
            Dismiss All
          </button>
          <button onClick={handleImportAll} style={styles.importAllBtn}>
            Import All ({pendingProducts.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '2px solid #e9ecef',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  content: {
    padding: '24px',
    flex: 1,
    overflowY: 'auto',
  },
  subtitle: {
    margin: '0 0 16px 0',
    color: '#6c757d',
    fontSize: '14px',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productCard: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  productImage: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '6px',
    background: '#f8f9fa',
  },
  productInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
  },
  productMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  supplier: {
    background: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#495057',
  },
  brand: {
    fontSize: '12px',
    color: '#6c757d',
  },
  price: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#FF6B35',
  },
  sku: {
    fontSize: '11px',
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  importBtn: {
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'transform 0.2s',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '2px solid #e9ecef',
    justifyContent: 'flex-end',
  },
  dismissBtn: {
    background: '#e9ecef',
    color: '#495057',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  importAllBtn: {
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default EzBossImporter;