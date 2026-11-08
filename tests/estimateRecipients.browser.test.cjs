const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('business recipients support one To, multiple Cc, and matching mobile behavior', async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Modal from './src/pages/estimates/components/estimateDashboard/estimateTab/SendEstimateModal';
      const root = createRoot(document.getElementById('root'));
      window.render = (business = true) => root.render(<Modal key={String(business)} isOpen onClose={()=>{}}
        estimate={{customerName:'Business', customerEmail:'main@example.com', estimateNumber:'EST-1',
          clientSnapshot:{billTo:business?'company':'person', contactName:'Main', email:'main@example.com',
            additionalContacts:[{name:'Alice',email:'alice@example.com'},{name:'Bob',email:'bob@example.com'},
              {name:'Duplicate',email:' ALICE@example.com '},{name:'No email',email:''}]}}}
        onSend={async data=>{window.sent=data}} />);
      window.render();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', loader: {'.css':'empty'}, define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{name:'auth',setup(b){
      b.onResolve({filter:/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const useAuthContext = () => ({userProfile:{company:"Test"}});'}));
    }}],
  });
  const { css } = await require('postcss')([require('tailwindcss')({
    content: ['./src/pages/estimates/components/estimateDashboard/estimateTab/SendEstimateModal.tsx'],
    corePlugins: { preflight: false },
  })]).process('@tailwind utilities;', { from: undefined });
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      await page.setContent('<div id="root"></div>');
      await page.addStyleTag({content:css});
      await page.addScriptTag({content:outputFiles[0].text});
      const to = page.getByLabel('To', {exact:true});
      const cc = page.getByLabel('CC (optional)', {exact:true});
      assert.equal(await page.getByRole('button', {name:'Remove main@example.com from To'}).count(), 1);
      const subject = page.getByPlaceholder('Email subject line');
      const before = await subject.boundingBox();
      await page.getByRole('button', {name:'Choose To contacts'}).click();
      assert.deepEqual(await subject.boundingBox(), before);
      const toGroup = page.getByRole('group', {name:'To recipients'});
      await toGroup.getByRole('checkbox', {name:/Alice/}).check();
      await toGroup.getByRole('checkbox', {name:/Bob/}).check();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', {name:'Remove alice@example.com from To'}).count(), 1);
      await page.getByRole('button', {name:'Remove bob@example.com from To'}).click();
      await to.fill('outside@example.com');
      await to.press('Enter');
      assert.equal(await to.inputValue(), '');
      assert.equal(await page.getByRole('button', {name:'Remove outside@example.com from To'}).count(), 1);
      await to.fill('OUTSIDE@example.com');
      await to.press('Enter');
      assert.equal(await page.getByRole('button', {name:/Remove .*outside@example.com from To/i}).count(), 1);
      await cc.fill('bob@example.com, guest@example.com');
      await cc.press('Enter');
      assert.equal(await page.getByRole('button', {name:'Remove guest@example.com from Cc'}).count(), 1);
      await cc.press('Backspace');
      assert.equal(await page.getByRole('button', {name:'Remove guest@example.com from Cc'}).count(), 0);
      await cc.fill('guest@example.com');
      await cc.press('Enter');
      const message = page.getByPlaceholder('Your message to the client...');
      const messageBefore = await message.boundingBox();
      await page.getByRole('button', {name:'Choose Cc contacts'}).click();
      assert.deepEqual(await message.boundingBox(), messageBefore);
      const ccGroup = page.getByRole('group', {name:'Cc recipients'});
      assert.equal(await ccGroup.getByRole('checkbox').count(), 3, 'manual addresses are not saved as contacts');
      assert.equal(await ccGroup.getByRole('checkbox', {name:/Alice/}).isDisabled(), true);
      assert.equal(await ccGroup.getByRole('checkbox', {name:/Bob/}).isChecked(), true);
      await page.keyboard.press('Escape');
      await to.fill('invalid');
      await to.press('Enter');
      await page.getByRole('button', {name:'Send Estimate',exact:true}).click();
      assert.equal(await page.getByRole('alertdialog').count(), 0);
      await to.fill('last@example.com');
      // Sending also commits a valid address that has not been confirmed with Enter.
      await page.getByRole('button', {name:'Send Estimate',exact:true}).click();
      const confirm = page.getByRole('alertdialog');
      await confirm.getByRole('button', {name:'Send Estimate',exact:true}).click();
      await page.waitForFunction(()=>!!window.sent);
      assert.equal((await page.evaluate(()=>window.sent)).recipientEmail,'main@example.com, alice@example.com, outside@example.com, last@example.com');
      assert.equal((await page.evaluate(()=>window.sent)).ccEmails,'bob@example.com, guest@example.com');
      await page.evaluate(()=>window.render(false));
      await page.getByRole('button', {name:'Choose To contacts'}).waitFor({state:'detached'});
      await page.getByLabel('To', {exact:true}).fill('personal@example.com');
      await page.getByLabel('To', {exact:true}).press('Enter');
      assert.equal(await page.getByRole('button', {name:'Remove personal@example.com from To'}).count(), 1);
      await page.close();
    }
  } finally {await browser.close();}
});
