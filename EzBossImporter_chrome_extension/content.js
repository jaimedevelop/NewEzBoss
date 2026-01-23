// Product extractors for different suppliers
const extractors = {
  homeDepot: {
    detect: () => window.location.hostname.includes('homedepot.com'),
    extract: () => {
      console.log('🏠 Extracting from Home Depot...');

      const data = {
        supplier: 'Home Depot',
        url: window.location.href,
        sku: '',
        price: '',
        imageUrl: ''
      };

      // Extract SKU - Home Depot specific
      try {
        // Try various SKU selectors
        const internetNum = document.querySelector('[data-testid="internet-number"]') ||
          document.querySelector('.pdp-details__internet-number') ||
          document.querySelector('[data-automation-id="product-internet-number"]') ||
          document.querySelector('#product-internet-number') ||
          document.querySelector('.product-details__internet-number');

        if (internetNum) {
          const match = internetNum.textContent.match(/\d+/);
          if (match) data.sku = match[0];
        }

        // Fallback: Model number
        if (!data.sku) {
          const modelEl = document.querySelector('[data-automation-id="product-model"]') ||
            document.querySelector('.pdp-details__model-number') ||
            document.querySelector('.product-details__model-number');
          if (modelEl) {
            data.sku = modelEl.textContent.trim().replace('Model #', '').replace('Model:', '').trim();
          }
        }

        // Fallback: Extract from URL (Home Depot URLs end with /INTERNET_NUMBER)
        if (!data.sku) {
          const urlMatch = window.location.pathname.match(/\/(\d{9})\/?$/);
          if (urlMatch) data.sku = urlMatch[1];
        }

        // Final fallback: metadata
        if (!data.sku) {
          const metaSku = document.querySelector('meta[itemprop="productID"]') ||
            document.querySelector('meta[property="og:upc"]');
          if (metaSku) data.sku = metaSku.content.replace('internet:', '').trim();
        }
      } catch (e) {
        console.error('Error extracting SKU:', e);
      }

      // Extract Price
      try {
        const priceSelectors = [
          '[data-testid="pricing-price-range-primary"]',
          '.price-format__main-price',
          '[data-automation-id="product-price-amount"]',
          '.price-format__price-container',
          '.price-container',
          'span[data-testid*="price"]',
          '.price-detailed__unit-price'
        ];

        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim()) {
            let priceText = el.innerText.replace(/\n+/g, '').replace(/\s+/g, '').replace(/[^0-9.]/g, '');
            if (!priceText.includes('.') && priceText.length > 2) {
              priceText = priceText.slice(0, -2) + '.' + priceText.slice(-2);
            }
            if (parseFloat(priceText) > 0) {
              data.price = priceText;
              break;
            }
          }
        }

        // Fallback: Try to find price in JSON-LD structured data
        if (!data.price) {
          const jsonLd = document.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const parsed = JSON.parse(jsonLd.textContent);
              const product = Array.isArray(parsed) ? parsed.find(p => p['@type'] === 'Product') : (parsed['@type'] === 'Product' ? parsed : null);
              if (product && product.offers && product.offers.price) {
                data.price = product.offers.price.toString();
              }
            } catch (e) { }
          }
        }

        // Final fallback: metadata
        if (!data.price) {
          const metaPrice = document.querySelector('meta[itemprop="price"], meta[property="og:price:amount"]');
          if (metaPrice) data.price = metaPrice.content || metaPrice.getAttribute('content');
        }
      } catch (e) {
        console.error('Error extracting price:', e);
      }

      // Extract Image
      try {
        const img = document.querySelector('[data-testid="main-product-image"]') ||
          document.querySelector('.main-image img') ||
          document.querySelector('[data-automation-id="primary-product-image-desktop"]');
        if (img && img.src) {
          data.imageUrl = img.src.replace(/_(100|145|300|400|600)\.jpg/i, '_1000.jpg');
        } else {
          const metaImg = document.querySelector('meta[property="og:image"]');
          if (metaImg) data.imageUrl = metaImg.content;
        }
      } catch (e) {
        console.error('Error extracting image:', e);
      }

      console.log('🏠 Home Depot extracted:', data);
      return data;
    }
  },

  lowes: {
    detect: () => window.location.hostname.includes('lowes.com'),
    extract: () => {
      console.log('🔵 Extracting from Lowes...');

      const data = {
        supplier: "Lowe's",
        url: window.location.href,
        sku: '',
        price: '',
        imageUrl: ''
      };

      // Extract SKU - Lowes specific
      try {
        // Try DOM selectors first
        const itemNumEl = document.querySelector('.item-number') ||
          document.querySelector('.pdp-product-id') ||
          document.querySelector('[data-selector="product-item-number"]') ||
          document.querySelector('.label-item-number') ||
          document.querySelector('[data-testid="product-item-number"]') ||
          document.querySelector('[class*="item-number"]') ||
          document.querySelector('[class*="model-number"]');

        if (itemNumEl) {
          const match = itemNumEl.textContent.match(/\d+/);
          if (match) data.sku = match[0];
        }

        // Fallback: Search page text for "Item #" or "Model #" patterns
        if (!data.sku) {
          // Look for patterns like "Item #154372" or "Model #154372"
          const itemMatch = document.body.innerText.match(/(?:Item|Model)\s*#?\s*:?\s*(\d{5,10})/i);
          if (itemMatch) data.sku = itemMatch[1];
        }

        // Fallback: Extract from URL (Lowe's URLs contain /pd/PRODUCT-NAME/ITEM_NUMBER)
        if (!data.sku) {
          const urlMatch = window.location.pathname.match(/\/pd\/[^\/]+\/(\d+)/);
          if (urlMatch) data.sku = urlMatch[1];
        }
      } catch (e) {
        console.error('Error extracting SKU:', e);
      }

      // Extract Price
      try {
        const priceSelectors = [
          '.ad-pdp-price',
          '.at-pdp-price',
          '.price',
          '.art-pd-price',
          '[data-selector="product-price"]',
          '[data-testid="price-main"]'
        ];

        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const match = el.textContent.match(/\$?(\d+[,.]\d{2})/);
            if (match) {
              data.price = match[1].replace(',', '');
              break;
            }
          }
        }

        // Fallback: Search page text for price pattern
        if (!data.price) {
          const priceMatch = document.body.innerText.match(/\$\s*(\d+\.\d{2})/);
          if (priceMatch) data.price = priceMatch[1];
        }

        // Final fallback: metadata
        if (!data.price) {
          const metaPrice = document.querySelector('meta[itemprop="price"]');
          if (metaPrice) data.price = metaPrice.content;
        }
      } catch (e) {
        console.error('Error extracting price:', e);
      }

      // Extract Image
      try {
        const img = document.querySelector('img.pdp-img') ||
          document.querySelector('[data-testid="pdp-main-image"]') ||
          document.querySelector('.pd-image-viewer__image img') ||
          document.querySelector('.main-image img') ||
          document.querySelector('img[itemprop="image"]') ||
          document.querySelector('.media-gallery__main-image img');

        if (img && img.src) {
          data.imageUrl = img.src.split('?')[0];
        } else if (img && img.dataset.src) {
          data.imageUrl = img.dataset.src.split('?')[0];
        } else {
          const metaImg = document.querySelector('meta[property="og:image"]');
          if (metaImg) data.imageUrl = metaImg.content;
        }
      } catch (e) {
        console.error('Error extracting image:', e);
      }

      console.log('🔵 Lowes extracted:', data);
      return data;
    }
  },

  ferguson: {
    detect: () => window.location.hostname.includes('ferguson.com'),
    extract: () => {
      console.log('🟢 Extracting from Ferguson...');

      const data = {
        supplier: 'Ferguson',
        url: window.location.href,
        sku: '',
        price: '',
        imageUrl: ''
      };

      // Extract SKU
      try {
        const skuEl = document.querySelector('.c-product-details__product-id') ||
          document.querySelector('.product-id') ||
          document.querySelector('[itemprop="sku"]');

        if (skuEl) {
          const text = skuEl.innerText;
          const partMatch = text.match(/Part\s*#\s*([A-Z0-9\-]+)/i);
          const itemMatch = text.match(/Item\s*#\s*(\d+)/i);
          data.sku = (partMatch ? partMatch[1] : (itemMatch ? itemMatch[1] : text.replace(/Part\s*#|Item\s*#/gi, '').trim()));
        }

        if (!data.sku) {
          const jsonLd = document.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const parsed = JSON.parse(jsonLd.textContent);
              const product = Array.isArray(parsed) ? parsed.find(p => p['@type'] === 'Product') : (parsed['@type'] === 'Product' ? parsed : null);
              if (product && product.sku) data.sku = product.sku;
            } catch (e) { }
          }
        }
      } catch (e) {
        console.error('Error extracting SKU:', e);
      }

      // Extract Price
      try {
        const priceSelectors = [
          '.price span',
          '.c-product-price .price-value',
          '[class*="price-value"]',
          '.actual-price'
        ];

        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const match = el.textContent.match(/\$?(\d+[,.]\d{2,3})/);
            if (match) {
              data.price = match[1].replace(',', '');
              break;
            }
          }
        }
      } catch (e) {
        console.error('Error extracting price:', e);
      }

      // Extract Image
      try {
        const img = document.querySelector('.c-product-details__image-container img') ||
          document.querySelector('.js-zoom-modal-btn img') ||
          document.querySelector('.product-image-gallery img') ||
          document.querySelector('.main-product-image img');

        if (img && img.src) {
          data.imageUrl = img.src;
        } else {
          const metaImg = document.querySelector('meta[property="og:image"]');
          if (metaImg) data.imageUrl = metaImg.content;
        }
      } catch (e) {
        console.error('Error extracting image:', e);
      }

      console.log('🟢 Ferguson extracted:', data);
      return data;
    }
  },

  winsupply: {
    detect: () => window.location.hostname.includes('winsupplyinc.com') || window.location.hostname.includes('hydrologicsupply.com'),
    extract: () => {
      console.log('🟡 Extracting from Winsupply/Hydrologic...');
      const supplierName = window.location.hostname.includes('hydrologic') ? 'Hydrologic' : 'Winsupply';

      const data = {
        supplier: supplierName,
        url: window.location.href,
        sku: '',
        price: '',
        imageUrl: ''
      };

      // Extract SKU
      try {
        const skuEl = document.querySelector('.pd-list_item--num') ||
          document.querySelector('[aria-label^="Item Number"]');
        if (skuEl) {
          data.sku = skuEl.textContent.replace(/Item\s*#:/i, '').replace('Item Number', '').trim();
        }

        if (!data.sku) {
          const match = document.body.innerText.match(/Item\s*#:\s*(\d+)/i);
          if (match) data.sku = match[1];
        }
      } catch (e) {
        console.error('Error extracting SKU:', e);
      }

      // Extract Price
      try {
        const priceEl = document.querySelector('.pd-price--num') ||
          document.querySelector('.call_for_price') ||
          document.querySelector('.price') ||
          document.querySelector('[data-testid="product-price"]') ||
          document.querySelector('.product-price') ||
          document.querySelector('[class*="price"]');

        if (priceEl) {
          const match = priceEl.textContent.match(/\$?(\d+[,.]\d{2})/);
          if (match) {
            data.price = match[1].replace(',', '');
          } else if (priceEl.textContent.includes('Sign in')) {
            data.price = 'Sign in for price';
          }
        }

        // Fallback: Search page text for price pattern
        if (!data.price) {
          const priceMatch = document.body.innerText.match(/\$\s*(\d+\.\d{2})/);
          if (priceMatch) data.price = priceMatch[1];
        }

        // Fallback: Try to find price in JSON-LD structured data
        if (!data.price) {
          const jsonLd = document.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const parsed = JSON.parse(jsonLd.textContent);
              const product = Array.isArray(parsed) ? parsed.find(p => p['@type'] === 'Product') : (parsed['@type'] === 'Product' ? parsed : null);
              if (product && product.offers && product.offers.price) {
                data.price = product.offers.price.toString();
              }
            } catch (e) { }
          }
        }
      } catch (e) {
        console.error('Error extracting price:', e);
      }

      // Extract Image
      try {
        const img = document.querySelector('img[itemprop="image"]') ||
          document.querySelector('.pd-main_image img') ||
          document.querySelector('.product-image img');
        if (img && img.src) {
          data.imageUrl = img.src;
        } else {
          const metaImg = document.querySelector('meta[property="og:image"]');
          if (metaImg) data.imageUrl = metaImg.content;
        }
      } catch (e) {
        console.error('Error extracting image:', e);
      }

      console.log('🟡 Winsupply extracted:', data);
      return data;
    }
  },

  generic: {
    detect: () => true, // Fallback for any other site
    extract: () => {
      console.log('🔍 Using generic extractor...');

      const data = {
        supplier: window.location.hostname.replace('www.', '').split('.')[0],
        url: window.location.href,
        sku: '',
        price: '',
        imageUrl: ''
      };

      try {
        // Try Meta tags for SKU
        const sku = document.querySelector('meta[itemprop="sku"]') ||
          document.querySelector('meta[name="sku"]') ||
          document.querySelector('meta[property="product:retailer_item_id"]');
        if (sku) data.sku = sku.content || sku.getAttribute('content');

        // Try Meta tags for Price
        const price = document.querySelector('meta[itemprop="price"]') ||
          document.querySelector('meta[property="product:price:amount"]') ||
          document.querySelector('meta[property="og:price:amount"]');
        if (price) data.price = price.content || price.getAttribute('content');

        // Try Meta tags for Image
        const img = document.querySelector('meta[property="og:image"]') ||
          document.querySelector('link[rel="image_src"]') ||
          document.querySelector('meta[name="twitter:image"]');
        if (img) data.imageUrl = img.content || img.getAttribute('content') || img.getAttribute('href');

        // Text search fallbacks
        if (!data.sku) {
          const skuMatch = document.body.innerText.match(/(?:SKU|Item|Part)\s*#?\s*:?\s*([A-Z0-9\-]{4,})/i);
          if (skuMatch) data.sku = skuMatch[1];
        }

        if (!data.price) {
          const priceMatch = document.body.innerText.match(/\$\s*(\d+[,.]\d{2})/);
          if (priceMatch) data.price = priceMatch[1].replace(',', '');
        }
      } catch (e) {
        console.error('Error in generic extraction:', e);
      }

      return data;
    }
  }
};

// Function to detect and extract product data
function extractProductData() {
  console.log('🔍 Starting extraction from:', window.location.hostname);

  for (const [name, extractor] of Object.entries(extractors)) {
    if (extractor.detect()) {
      console.log(`✅ Detected supplier: ${name}`);
      const data = extractor.extract();

      // Validate data
      if (!data.sku) console.warn('⚠️ No SKU found');
      if (!data.price) console.warn('⚠️ No price found');
      if (!data.imageUrl) console.warn('⚠️ No image found');

      return data;
    }
  }

  // Generic fallback
  console.warn('❌ Could not detect supplier');
  return {
    supplier: 'Unknown',
    url: window.location.href,
    sku: '',
    price: '',
    imageUrl: '',
    error: 'Unsupported supplier. Please use Home Depot, Lowes, Ferguson, or Winsupply.'
  };
}

// Function to show toast notification
function showToast(message, duration = 3000) {
  const existingToast = document.querySelector('.ezboss-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'ezboss-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received message:', request);

  if (request.action === "getProductData") {
    const productData = extractProductData();
    console.log('📤 Sending product data:', productData);
    sendResponse({ productData: productData });
  }

  return true;
});

console.log('✅ EzBoss content script loaded on:', window.location.hostname);