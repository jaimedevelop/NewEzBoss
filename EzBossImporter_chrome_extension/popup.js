// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'collect') {
      loadCollectedSuppliers();
    }
  });
});

// Load settings
chrome.storage.local.get(['ezbossUrl', 'autoOpenEzboss', 'includeImages'], (result) => {
  if (result.ezbossUrl) {
    document.getElementById('ezbossUrl').value = result.ezbossUrl;
  }
  if (result.autoOpenEzboss !== undefined) {
    document.getElementById('autoOpenEzboss').checked = result.autoOpenEzboss;
  }
  if (result.includeImages !== undefined) {
    document.getElementById('includeImages').checked = result.includeImages;
  }
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const ezbossUrl = document.getElementById('ezbossUrl').value;
  const autoOpenEzboss = document.getElementById('autoOpenEzboss').checked;
  const includeImages = document.getElementById('includeImages').checked;

  chrome.storage.local.set({
    ezbossUrl,
    autoOpenEzboss,
    includeImages
  }, () => {
    const btn = document.getElementById('saveSettings');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  });
});

// Storage key for collected suppliers
const STORAGE_KEY = 'collectedSuppliers';

// Scan all open tabs for supplier data
document.getElementById('scanTabs').addEventListener('click', async () => {
  const btn = document.getElementById('scanTabs');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Scanning...';
  btn.disabled = true;

  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Filter for product pages (broadened)
    const productTabs = tabs.filter(tab =>
      tab.url && (
        tab.url.includes('homedepot.com') ||
        tab.url.includes('lowes.com') ||
        tab.url.includes('ferguson.com') ||
        tab.url.includes('winsupplyinc.com') ||
        tab.url.includes('hydrologicsupply.com') ||
        tab.url.includes('/p/') ||
        tab.url.includes('/pd/') ||
        tab.url.includes('/product/')
      ) && !tab.url.includes('google.com')
    );

    if (productTabs.length === 0) {
      alert('No supplier product pages found in open tabs.\n\nPlease open product pages from:\n- Home Depot\n- Lowe\'s\n- Ferguson\n- Hydrologic/Winsupply');
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      return;
    }

    // Collect data from each tab
    const suppliers = [];

    for (const tab of productTabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductData' });

        if (response && response.productData && !response.productData.error) {
          const data = response.productData;

          // Store only supplier-specific data
          suppliers.push({
            supplier: data.supplier,
            sku: data.sku,
            price: data.price,
            imageUrl: data.imageUrl,
            url: data.url,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.log(`Could not extract from tab: ${tab.url}`);
      }
    }

    if (suppliers.length === 0) {
      alert('Could not extract data from any tabs.\n\nTry refreshing the product pages and scanning again.');
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      return;
    }

    // Store collected suppliers
    chrome.storage.local.set({ [STORAGE_KEY]: suppliers }, () => {
      btn.innerHTML = `<span class="btn-icon">✓</span> Found ${suppliers.length} Supplier${suppliers.length > 1 ? 's' : ''}`;
      loadCollectedSuppliers();

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
    });

  } catch (error) {
    console.error('Scan error:', error);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    alert('Error scanning tabs. Please try again.');
  }
});

// Load and display collected suppliers
function loadCollectedSuppliers() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const suppliers = result[STORAGE_KEY] || [];
    const container = document.getElementById('collectedSuppliers');
    const emptyState = document.getElementById('emptyState');
    const suppliersList = document.getElementById('suppliersList');
    const supplierCount = document.getElementById('supplierCount');
    const imageSelection = document.getElementById('imageSelection');
    const imageOptions = document.getElementById('imageOptions');

    if (suppliers.length === 0) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    supplierCount.textContent = suppliers.length;

    // Display suppliers
    suppliersList.innerHTML = '';

    suppliers.forEach((supplier, index) => {
      const card = document.createElement('div');
      card.className = 'supplier-card';
      card.innerHTML = `
        <div class="supplier-main">
          <div class="supplier-badge">${supplier.supplier}</div>
          <div class="supplier-details">
            <div class="supplier-detail-row">
              <strong>SKU:</strong> <span>${supplier.sku || 'N/A'}</span>
            </div>
            <div class="supplier-detail-row">
              <strong>Price:</strong> <span class="price-value">$${supplier.price || '0.00'}</span>
            </div>
            ${supplier.imageUrl ? `
              <div class="supplier-detail-row">
                <strong>Image:</strong> <span class="has-image">✓ Available</span>
              </div>
            ` : ''}
          </div>
        </div>
        <button class="btn-icon-only delete-supplier" data-index="${index}" title="Remove">🗑️</button>
      `;

      suppliersList.appendChild(card);
    });

    // Delete buttons
    document.querySelectorAll('.delete-supplier').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        deleteSupplier(index);
      });
    });

    // Show image selection if any supplier has images
    const suppliersWithImages = suppliers.filter(s => s.imageUrl);

    if (suppliersWithImages.length > 0) {
      imageSelection.classList.remove('hidden');
      imageOptions.innerHTML = '';

      suppliersWithImages.forEach((supplier, index) => {
        const option = document.createElement('label');
        option.className = 'image-option';
        option.innerHTML = `
          <input type="radio" name="selectedImage" value="${index}" ${index === 0 ? 'checked' : ''}>
          <img src="${supplier.imageUrl}" alt="${supplier.supplier}" onerror="this.parentElement.style.display='none'">
          <span>${supplier.supplier}</span>
        `;
        imageOptions.appendChild(option);
      });
    } else {
      imageSelection.classList.add('hidden');
    }
  });
}

// Delete supplier
function deleteSupplier(index) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const suppliers = result[STORAGE_KEY] || [];
    suppliers.splice(index, 1);
    chrome.storage.local.set({ [STORAGE_KEY]: suppliers }, () => {
      loadCollectedSuppliers();
    });
  });
}

// Clear all collected suppliers
document.getElementById('clearCollected').addEventListener('click', () => {
  if (confirm('Clear all collected suppliers?')) {
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
      loadCollectedSuppliers();
    });
  }
});

// Send supplier data to EzBoss
document.getElementById('sendToEzboss').addEventListener('click', () => {
  chrome.storage.local.get([STORAGE_KEY, 'ezbossUrl', 'includeImages'], async (result) => {
    console.log('🚀 [POPUP] Send button clicked');
    const suppliers = result[STORAGE_KEY] || [];
    console.log('📊 [POPUP] Suppliers to send:', suppliers);

    if (suppliers.length === 0) {
      alert('No suppliers to send');
      return;
    }

    // Get selected image
    let selectedImage = null;
    const imageRadios = document.querySelectorAll('input[name="selectedImage"]');
    imageRadios.forEach((radio, idx) => {
      if (radio.checked) {
        const suppliersWithImages = suppliers.filter(s => s.imageUrl);
        if (suppliersWithImages[idx]) {
          selectedImage = suppliersWithImages[idx].imageUrl;
        }
      }
    });

    // Prepare supplier data package
    const supplierData = {
      suppliers: suppliers.map(s => ({
        supplier: s.supplier,
        sku: s.sku,
        price: s.price
      })),
      selectedImage: result.includeImages ? selectedImage : null,
      timestamp: Date.now()
    };

    console.log('📦 [POPUP] Supplier data package:', supplierData);

    // Open or focus EzBoss tab first (navigate to products page where the importer modal is)
    const ezbossUrl = result.ezbossUrl || 'http://localhost:5173';
    const productsPageUrl = `${ezbossUrl}/inventory/products`;
    console.log('🌐 [POPUP] Target URL:', productsPageUrl);

    // Check if EzBoss tab is already open
    const tabs = await chrome.tabs.query({});
    let ezbossTab = tabs.find(tab => tab.url && tab.url.startsWith(ezbossUrl));
    console.log('🔍 [POPUP] Found existing tab:', ezbossTab ? 'Yes' : 'No');

    try {
      if (ezbossTab) {
        // IMPORTANT: Inject data FIRST, then navigate
        console.log('💉 [POPUP] Injecting data into existing tab:', ezbossTab.id);
        await chrome.scripting.executeScript({
          target: { tabId: ezbossTab.id },
          func: (data) => {
            console.log('📦 Extension injecting supplier data:', data);
            localStorage.setItem('ezboss_supplier_data', JSON.stringify(data));
            console.log('✅ Data stored in localStorage');
          },
          args: [supplierData]
        });

        // NOW navigate to products page and focus
        console.log('➡️ [POPUP] Navigating to products page');
        await chrome.tabs.update(ezbossTab.id, { url: productsPageUrl, active: true });
        await chrome.windows.update(ezbossTab.windowId, { focused: true });
      } else {
        // For new tab: Create tab pointing to home first, inject data, then navigate
        console.log('➕ [POPUP] Creating new tab');
        const newTab = await chrome.tabs.create({ url: ezbossUrl, active: true });
        ezbossTab = newTab;

        // Wait for tab to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Inject data into the new tab
        console.log('💉 [POPUP] Injecting data into new tab:', ezbossTab.id);
        await chrome.scripting.executeScript({
          target: { tabId: ezbossTab.id },
          func: (data) => {
            console.log('📦 Extension injecting supplier data:', data);
            localStorage.setItem('ezboss_supplier_data', JSON.stringify(data));
            console.log('✅ Data stored in localStorage');
          },
          args: [supplierData]
        });

        // NOW navigate to products page
        console.log('➡️ [POPUP] Navigating to products page');
        await chrome.tabs.update(ezbossTab.id, { url: productsPageUrl });
      }

      console.log('✅ [POPUP] Data injection successful');

      // Clear collected suppliers
      chrome.storage.local.set({ [STORAGE_KEY]: [] });

      // Show success and close popup
      alert(`✓ Sent ${suppliers.length} supplier${suppliers.length > 1 ? 's' : ''} to EzBoss!`);
      window.close();
    } catch (error) {
      console.error('❌ [POPUP] Error injecting data:', error);
      alert('Error sending data to EzBoss. Please try again.');
    }
  });
});

// ============================================
// MANUAL SUPPLIER ADDITION
// ============================================

document.getElementById('addManualSupplier').addEventListener('click', () => {
  const supplier = document.getElementById('manualSupplier').value.trim();
  const sku = document.getElementById('manualSku').value.trim();
  const price = document.getElementById('manualPrice').value.trim();
  const imageUrl = document.getElementById('manualImageUrl').value.trim();

  // Validation
  if (!supplier) {
    alert('Please enter a supplier name');
    return;
  }
  if (!sku) {
    alert('Please enter a SKU or Item Number');
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    alert('Please enter a valid price');
    return;
  }

  // Add to collected suppliers
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const suppliers = result[STORAGE_KEY] || [];

    suppliers.push({
      supplier: supplier,
      sku: sku,
      price: parseFloat(price).toFixed(2),
      imageUrl: imageUrl || null,
      url: '',
      timestamp: Date.now(),
      source: 'manual'
    });

    chrome.storage.local.set({ [STORAGE_KEY]: suppliers }, () => {
      // Show success
      const infoBox = document.getElementById('manualCollectedInfo');
      infoBox.classList.remove('hidden');

      // Clear form
      clearManualForm();

      setTimeout(() => {
        infoBox.classList.add('hidden');
      }, 3000);
    });
  });
});

document.getElementById('clearManual').addEventListener('click', clearManualForm);

function clearManualForm() {
  document.getElementById('manualSupplier').value = '';
  document.getElementById('manualSku').value = '';
  document.getElementById('manualPrice').value = '';
  document.getElementById('manualImageUrl').value = '';
}

// Load collected suppliers on popup open
loadCollectedSuppliers();