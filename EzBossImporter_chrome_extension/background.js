// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "importToEzBoss",
    title: "📦 Import Product to EzBoss",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "copyImageUrl",
    title: "🖼️ Copy Image URL (High Quality)",
    contexts: ["image"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "importToEzBoss") {
    chrome.tabs.sendMessage(tab.id, {
      action: "extractAndSendProduct"
    });
  }
  
  if (info.menuItemId === "copyImageUrl" && info.srcUrl) {
    const highQualityUrl = getHighQualityUrl(info.srcUrl);
    chrome.tabs.sendMessage(tab.id, {
      action: "copyToClipboard",
      url: highQualityUrl
    });
  }
});

// Function to get high quality URL
function getHighQualityUrl(url) {
  if (url.includes('thdstatic.com')) {
    url = url.replace(/_(100|145|300|400|600)\.jpg/i, '_1000.jpg');
  }
  if (url.includes('lowes.com')) {
    url = url.split('?')[0];
  }
  return url;
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openEzBossImport") {
    // Store the product data
    chrome.storage.local.set({ pendingProduct: request.productData }, () => {
      // Open EzBoss in a new tab (you'll need to configure your EzBoss URL)
      const ezbossUrl = "http://localhost:5173"; // Change this to your actual EzBoss URL
      chrome.tabs.create({ url: ezbossUrl });
    });
  }
  
  if (request.action === "bulkProcessUrls") {
    // Process multiple URLs
    processBulkUrls(request.urls, sendResponse);
    return true; // Keep channel open for async response
  }
});