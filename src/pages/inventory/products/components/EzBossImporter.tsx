import React, { useEffect, useState } from 'react';

/**
 * EzBoss Supplier Importer Component
 * 
 * This component receives supplier data from the Chrome extension and adds it to your product form.
 * 
 * Maps to your EzBoss form tabs:
 * - SKU Tab: Adds rows with Store + SKU
 * - Price Tab: Adds rows with Store + Price
 * - Image Tab: Sets the product image URL (optional)
 * 
 * Integration: Place this component in your main App/Layout component
 */

export interface SupplierData {
  supplier: string;  // Maps to "Store" dropdown in SKU/Price tabs
  sku: string;       // Maps to "SKU/Part Number" field in SKU tab
  price: string;     // Maps to "Price" field in Price tab
}

export interface SupplierPackage {
  suppliers: SupplierData[];           // Array of suppliers to add
  selectedImage: string | null;        // Maps to "Product Image URL" in Image tab
  timestamp: number;
}

interface EzBossImporterProps {
  /**
   * Callback when user confirms import
   * @param suppliers - Array of {supplier, sku, price} to add to SKU and Price tabs
   * @param imageUrl - Optional image URL to set in Image tab
   */
  onSuppliersImport: (suppliers: SupplierData[], imageUrl?: string) => void;

  /**
   * Optional: Current product name from General tab to show in modal
   */
  currentProductName?: string;

  /**
   * External trigger to manually open the modal (for the Utilities button)
   */
  triggerOpen?: boolean;
}

const EzBossImporter: React.FC<EzBossImporterProps> = ({
  onSuppliersImport,
  currentProductName,
  triggerOpen
}) => {
  const [showModal, setShowModal] = useState(false);
  const [supplierPackage, setSupplierPackage] = useState<SupplierPackage | null>(null);

  useEffect(() => {
    // Method 1: Check localStorage (Chrome extension sets this)
    const checkForSupplierData = () => {
      const storedData = localStorage.getItem('ezboss_supplier_data');

      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setSupplierPackage(data);
          setShowModal(true);
          localStorage.removeItem('ezboss_supplier_data'); // Clear after reading
        } catch (error) {
          console.error('Error parsing supplier data:', error);
        }
      }
    };

    // Check immediately
    checkForSupplierData();

    // Method 2: Listen for postMessage from Chrome extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EZBOSS_SUPPLIER_DATA') {
        setSupplierPackage(event.data.data);
        setShowModal(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Periodic check (every 2 seconds) while component is mounted
    const interval = setInterval(checkForSupplierData, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  // Effect to handle manual trigger from Utilities button
  useEffect(() => {
    if (triggerOpen && !showModal) {
      setShowModal(true);
      // If manually triggered and no package, we might want to show a default state 
      // or check localStorage again.
    }
  }, [triggerOpen]);

  const handleImportSuppliers = () => {
    if (!supplierPackage) return;

    console.log('🎯 [EzBossImporter] Importing suppliers:', supplierPackage);

    // Call your callback with the supplier data
    onSuppliersImport(
      supplierPackage.suppliers,
      supplierPackage.selectedImage || undefined
    );

    console.log('✅ [EzBossImporter] onSuppliersImport called, closing modal');

    // Close modal
    setShowModal(false);
    setSupplierPackage(null);
  };

  const handleDismiss = () => {
    setShowModal(false);
    setSupplierPackage(null);
  };

  if (!showModal) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📦 Add Suppliers to Product</h2>
          <button onClick={handleDismiss} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {!supplierPackage ? (
            <div style={styles.noDataState}>
              <p>No supplier data found. Use the EzBoss Chrome extension to gather supplier information from websites like Home Depot, Lowe's, etc.</p>
            </div>
          ) : (
            <>
              {/* Current Product Info */}
              {currentProductName && (
                <div style={styles.productInfo}>
                  <div style={styles.productLabel}>Adding suppliers to:</div>
                  <div style={styles.productName}>{currentProductName}</div>
                </div>
              )}

              {/* Supplier Count */}
              <p style={styles.subtitle}>
                Found {supplierPackage.suppliers.length} supplier
                {supplierPackage.suppliers.length !== 1 ? 's' : ''} ready to add:
              </p>

              {/* Supplier List */}
              <div style={styles.supplierList}>
                {supplierPackage.suppliers.map((supplier, index) => (
                  <div key={index} style={styles.supplierCard}>
                    <div style={styles.supplierBadge}>{supplier.supplier}</div>
                    <div style={styles.supplierDetails}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>SKU:</span>
                        <span style={styles.detailValue}>{supplier.sku}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Price:</span>
                        <span style={styles.priceValue}>${supplier.price}</span>
                      </div>
                    </div>
                    <span style={styles.checkIcon}>✓</span>
                  </div>
                ))}
              </div>

              {/* Image Preview */}
              {supplierPackage.selectedImage && (
                <div style={styles.imageSection}>
                  <div style={styles.imageLabel}>Selected Product Image:</div>
                  <img
                    src={supplierPackage.selectedImage}
                    alt="Product"
                    style={styles.productImage}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <div style={styles.imageUrl}>{supplierPackage.selectedImage}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={handleDismiss} style={styles.cancelBtn}>
            Close
          </button>
          {supplierPackage && (
            <button onClick={handleImportSuppliers} style={styles.importBtn}>
              Add {supplierPackage.suppliers.length} Supplier
              {supplierPackage.suppliers.length !== 1 ? 's' : ''} to Product
            </button>
          )}
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
    maxWidth: '600px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
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
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  content: {
    padding: '24px',
    flex: 1,
    overflowY: 'auto',
  },
  noDataState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  productInfo: {
    background: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '2px solid #e9ecef',
  },
  productLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  productName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#212529',
  },
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#495057',
    fontWeight: '600',
  },
  supplierList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  supplierCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
  },
  supplierBadge: {
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    minWidth: '130px',
    textAlign: 'center',
    flexShrink: 0,
  },
  supplierDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  detailRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6c757d',
    fontWeight: '600',
    minWidth: '50px',
  },
  detailValue: {
    color: '#212529',
    fontFamily: 'monospace',
  },
  priceValue: {
    color: '#28a745',
    fontWeight: '700',
    fontSize: '16px',
  },
  checkIcon: {
    fontSize: '28px',
    color: '#28a745',
    flexShrink: 0,
  },
  imageSection: {
    background: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
  },
  imageLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '12px',
  },
  productImage: {
    width: '180px',
    height: '180px',
    objectFit: 'contain',
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '12px',
    border: '1px solid #dee2e6',
  },
  imageUrl: {
    fontSize: '11px',
    color: '#6c757d',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '2px solid #e9ecef',
    justifyContent: 'flex-end',
    background: '#f8f9fa',
  },
  cancelBtn: {
    background: '#e9ecef',
    color: '#495057',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  importBtn: {
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
};

export default EzBossImporter;
