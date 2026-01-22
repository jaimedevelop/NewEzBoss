# EzBoss Supplier Data Collector - Installation & Usage Guide

## 🎯 What This Extension Does

**NEW WORKFLOW** - Matches your actual process:

1. **YOU** create the product in EzBoss first (name, category, etc. - **YOUR** description)
2. **Extension** collects ONLY supplier data (Description + SKU + Price + Image) from open tabs
3. **Extension** sends supplier data to fill your SKU tab, Price tab, and Image tab
4. **Result**: ONE product with MULTIPLE suppliers and prices added automatically

---

## 🚀 Part 1: Install Chrome Extension

### Step 1: Create Extension Folder
1. Create a folder called `EzBossSupplierCollector`
2. Save these files:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `content.css`
   - `popup.html`
   - `popup.js`
   - `popup.css`

### Step 2: Create Icon Files
Use https://www.favicon-generator.org/ to create:
- `icon16.png`
- `icon48.png`
- `icon128.png`

### Step 3: Load in Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your folder

---

## 📖 How to Use - YOUR Workflow

### Step-by-Step Process:

**Step 1: Create Product in EzBoss**
```
Open EzBoss → Products → New Product
Fill General Tab:
  - Product Name: "PEX-A Pipe 1/2 - 20FT" (YOUR description)
  - Trade: "Plumbing"
  - Category: "PEX"
  - Brand: "Generic"
  - Type: "20FT"
  - Size: "1/2""
  
DON'T SAVE YET - Leave form open
```

**Step 2: Open Supplier Tabs in Chrome**
```
Open these tabs (for same product):
Tab 1: Home Depot product page
Tab 2: Lowe's product page
Tab 3: Ferguson product page
Tab 4: (Optional) Add manual supplier
```

**Step 3: Collect Supplier Data**
```
Click extension icon
Click "Scan All Open Tabs"
Extension finds: 3 suppliers
Review collected data (Description is optional):
  ✓ Home Depot - SKU: 1007518763 - $8.86
  ✓ Lowe's - SKU: 6242684 - $9.84
  ✓ Ferguson - SKU: PEXD20BL - $10.74
```

**Step 4: Select Product Image**
```
Extension shows images from each supplier
Click the one you want to use
```

**Step 5: Send to EzBoss**
```
Click "Send Supplier Data to EzBoss"
Extension opens EzBoss tab
Modal appears: "Add 3 suppliers to current product?"
Click "Add Suppliers"
```

**Step 6: Data Fills Automatically**
```
SKU Tab automatically fills:
  Store: Home Depot | SKU: 1007518763
  Store: Lowe's | SKU: 6242684
  Store: Ferguson | SKU: PEXD20BL
  
Price Tab automatically fills:
  Home Depot: $8.86
  Lowe's: $9.84
  Ferguson: $10.74
  
Image Tab: Selected image URL added

YOU: Click Save!
```

---

## 🎯 Two Methods to Add Suppliers

### Method 1: Scan Open Tabs (Automatic)
**Best for:** Home Depot, Lowe's, Ferguson, Hydrologic

1. Open multiple supplier tabs for same product
2. Click extension → "Scan All Open Tabs"
3. Extension extracts: SKU + Price + Image from each
4. Review → Send to EzBoss

### Method 2: Manual Entry
**Best for:** Local suppliers, phone quotes, catalogs

1. Click extension → "Add Manual" tab
2. Enter:
   - Supplier Name (e.g., "Tampa Plumbing Supply")
   - SKU (e.g., "TPS-50")
   - Price (e.g., "8.75")
   - Image URL (optional)
3. Click "Add to Collection"
4. Go to "Collect Suppliers" tab
5. Send to EzBoss with other suppliers

---

## 💡 Real Example - Complete Workflow

### Scenario: Adding PEX Pipe with 4 Suppliers

**1. Create Product in EzBoss:**
```
Product Name: PEX-A Pipe 1/2 - 20FT
Category: PEX
Subcategory: PEX-A
Size: 1/2"
Type: 20FT
[Leave form open - don't save yet]
```

**2. Open Chrome Tabs:**
```
Tab 1: https://www.homedepot.com/p/Apollo-1-2-in-x-20-ft-Blue-PEX-A/...
Tab 2: https://www.lowes.com/pd/UPONOR-1-2-in-x-20-ft-White-AquaPEX/...
Tab 3: https://www.ferguson.com/product/pex-a-pipe-1-2-20ft/...
```

**3. Click Extension Icon:**
```
Click "Scan All Open Tabs"

Found 3 suppliers:
✓ Home Depot - SKU: 1007518763 - $8.86 - [Image]
✓ Lowe's - SKU: 6242684 - $9.84 - [Image]
✓ Ferguson - SKU: PEXD20BL - $10.74 - [No Image]
```

**4. Add Manual Supplier (Optional):**
```
Click "Add Manual" tab
  Supplier: Tampa Plumbing Supply
  SKU: TPS-PEX-50
  Price: 8.75
Click "Add to Collection"

Now have 4 suppliers total
```

**5. Select Image:**
```
Choose Home Depot's image (looks best)
[Radio button selected]
```

**6. Send to EzBoss:**
```
Click "Send Supplier Data to EzBoss"
[New tab opens to EzBoss]
Modal shows: "Add 4 suppliers to current product?"
Click "Add 4 Suppliers to Product"
```

**7. Check Your Form:**
```
SKU Tab now has:
- Home Depot: 1007518763
- Lowe's: 6242684
- Ferguson: PEXD20BL
- Tampa Plumbing Supply: TPS-PEX-50

Price Tab now has:
- Home Depot: $8.86
- Lowe's: $9.84
- Ferguson: $10.74
- Tampa Plumbing Supply: $8.75

Image Tab: Home Depot's image URL

YOU: Click Save button!
```

**Result:** ONE product with FOUR supplier price comparisons! ✅

---

## 🔍 What Data Gets Collected

### From Each Supplier Tab:
- ✅ **Item Description** (This is optional)
- ✅ **Supplier Name** (Home Depot, Lowe's, etc.)
- ✅ **SKU/Part Number** (goes to SKU tab)
- ✅ **Price** (goes to Price tab)
- ✅ **Image URL** (you choose which one)

### What's NOT collected:
- ❌ Product name (YOU write this)
- ❌ Category (YOU choose this)
- ❌ Brand (YOU decide this)

**This is YOUR product - YOU control the description!**

---

## 🎨 Benefits of This Workflow

### Before Extension:
```
1. Open Home Depot page
2. Copy SKU → Paste in EzBoss SKU tab
3. Copy price → Paste in EzBoss Price tab
4. Copy image URL → Paste in EzBoss Image tab
5. Repeat for Lowe's
6. Repeat for Ferguson
7. Repeat for Local Supplier
Time: 10-15 minutes per product
```

### With Extension:
```
1. Open all supplier tabs
2. Click "Scan All Open Tabs"
3. Click "Send to EzBoss"
4. Data fills automatically
Time: 30 seconds per product
```

**Time Savings: 95%** ⏱️

---

## 🛠️ Troubleshooting

**Extension doesn't find any suppliers:**
- Make sure you're on actual product pages (not search results)
- Supported sites: Home Depot, Lowe's, Ferguson, Hydrologic
- Check URL contains `/p/` or `/pd/` or `/product/`

**Scan button says "No supplier pages found":**
- Open at least one supported supplier product page
- Refresh pages if needed
- Try "Add Manual" tab instead

**Data not showing in EzBoss:**
- Make sure EzBoss app is running
- Check Settings tab for correct EzBoss URL
- Verify you have product form open in EzBoss

---

## 🎯 Supported Suppliers

| Supplier | Auto-Scan | Manual Entry |
|----------|-----------|--------------|
| Home Depot | ✅ Yes | ✅ Yes |
| Lowe's | ✅ Yes | ✅ Yes |
| Ferguson | ✅ Yes | ✅ Yes |
| Hydrologic | ✅ Yes | ✅ Yes |
| Local Suppliers | ❌ No | ✅ Yes |
| Phone Quotes | ❌ No | ✅ Yes |
| Any Other | ❌ No | ✅ Yes |

---

## ✅ Quick Reference

### Your 5-Step Workflow:
1. 📝 Create product in EzBoss (YOUR description it is optional)
2. 🌐 Open supplier tabs (2-4 tabs for same product)
3. 🔍 Scan tabs with extension
4. 📤 Send supplier data to EzBoss
5. 💾 Save product in EzBoss

### Extension Collects:
- Description (optional)
- Supplier name
- SKU
- Price  
- Image URL

### You Control:
- Product name
- Trade
- Section
- Category
- Subcategory
- Type
- Brand
- Description
- Which image to use

---

**You're all set! This extension saves you 10-15 minutes per product.** 🚀