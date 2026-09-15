import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, Package, Layers, FileText, Receipt, BarChart3, Plus } from 'lucide-react';
import './landing.css';

const workflow = [
  { icon: Package, name: 'Inventory', copy: 'Your imported products, labor, tools, and equipment. Organized and ready to use.' },
  { icon: Layers, name: 'Collections', copy: 'Group the items you use together into reusable assemblies for the work you do often.' },
  { icon: FileText, name: 'Estimates', copy: 'Bring a collection into an estimate, adjust quantities, and price the job with your existing data.' },
  { icon: Receipt, name: 'Invoices', copy: 'Carry the job forward into an invoice without rebuilding the same line items.' },
  { icon: BarChart3, name: 'Finances', copy: 'Keep job costs, payments, and outstanding balances in view as the work moves forward.' },
];

function Logo() {
  return <span className="ez-logo"><img src="/EzBossLogo.png" alt="EzBoss" /></span>;
}

const Landing: React.FC = () => (
  <div className="ez-landing">
    <a className="ez-skip" href="#main">Skip to content</a>
    <header className="ez-header">
      <div className="ez-wrap ez-nav">
        <Link to="/landing" aria-label="EzBoss home"><Logo /></Link>
        <a className="ez-nav-story" href="#how-it-works">How it works</a>
        <div className="ez-nav-actions"><Link to="/landing/login" className="ez-signin">Sign in</Link><Link to="/landing/signup" className="ez-button">Get started <ArrowRight size={17} /></Link></div>
      </div>
    </header>
    <main id="main">
      <section className="ez-hero">
        <div className="ez-wrap ez-hero-grid">
          <div className="ez-hero-copy">
            <p className="ez-eyebrow"><span /> BUILT FOR THE WAY CONTRACTORS WORK</p>
            <h1>Less tedious estimates.<br /><em>More building.</em></h1>
            <p className="ez-lead">Put your imported data to work. Turn the materials and labor you already have into reusable collections—and your next estimate into a much shorter to-do.</p>
            <div className="ez-hero-actions"><Link className="ez-button" to="/landing/signup">Get started with EzBoss <ArrowRight size={19} /></Link><a className="ez-text-link" href="#how-it-works">See how it connects <ArrowDown size={17} /></a></div>
            <p className="ez-hero-note">From the first material to the final payment. All connected.</p>
          </div>
          <div className="ez-workbench" aria-label="Illustrative example of a collection used in an estimate">
            <div className="ez-metal ez-workbench-rail" aria-hidden="true" />
            <div className="ez-bench-heading"><span>YOUR NEXT ESTIMATE STARTS HERE</span><span className="ez-example">Example workflow</span></div>
            <div className="ez-collection">
              <div className="ez-panel-title"><span className="ez-icon"><Layers size={22} /></span><div><small>SAVED COLLECTION</small><h3>Bathroom rough-in</h3></div><span className="ez-reuse">Reusable</span></div>
              <div className="ez-item"><span>Pipe & fittings</span><span>Materials</span></div>
              <div className="ez-item"><span>Rough-in installation</span><span>Labor</span></div>
              <div className="ez-item"><span>Tools & equipment</span><span>Job essentials</span></div>
              <div className="ez-imported"><Check size={15} /> Built from your existing inventory</div>
            </div>
            <div className="ez-transfer"><span /><ArrowDown size={18} /><p>Add collection. Adjust for the job.</p></div>
            <div className="ez-estimate"><div className="ez-panel-title"><FileText size={23} /><div><small>NEW ESTIMATE</small><h3>Oak Street renovation</h3></div></div><div className="ez-added"><Plus size={16} /><span>Bathroom rough-in</span><span>Added</span></div><p>Your items and pricing, ready to work with.</p></div>
            <div className="ez-bench-footer"><span>Estimate</span><ArrowRight size={14} /><span>Invoice</span><ArrowRight size={14} /><span>Finances</span></div>
          </div>
        </div>
        <div className="ez-wrap ez-trades"><span>YOUR TRADE. YOUR WORKFLOW.</span><p>Plumbing <b>/</b> Electrical <b>/</b> HVAC <b>/</b> Construction</p></div>
      </section>
      <section className="ez-connected" id="how-it-works">
        <div className="ez-wrap">
          <div className="ez-section-heading"><div><p className="ez-eyebrow">ONE CONNECTED WORKFLOW</p><h2>Enter it once.<br />Keep the job moving.</h2></div><p>Inventory, collections, estimates, invoices, and finances belong together. EzBoss connects them so you spend less time moving information and more time moving the job forward.</p></div>
          <ol className="ez-workflow">{workflow.map(({ icon: Icon, name, copy }, index) => <li key={name}><div className="ez-step-top"><Icon size={26} /><span>0{index + 1}</span></div><h3>{name}</h3><p>{copy}</p>{index < workflow.length - 1 && <ArrowRight className="ez-step-arrow" size={19} aria-hidden="true" />}</li>)}</ol>
        </div>
      </section>
      <section className="ez-collections-section">
        <div className="ez-metal ez-side-metal" aria-hidden="true" />
        <div className="ez-wrap ez-collections-grid">
          <div><p className="ez-eyebrow">DO THE SETUP. REUSE THE WORK.</p><h2>Your experience.<br />Saved as a collection.</h2><p className="ez-lead">You already know what goes into the jobs you do most. Save those materials, labor, tools, and equipment together, then bring that starting point to the next estimate.</p><a href="/landing/signup" className="ez-text-link">Build your first collection <ArrowRight size={18} /></a></div>
          <div className="ez-benefits"><article><span>01</span><div><h3>Start with data, not a blank sheet.</h3><p>Use the products and pricing already imported into your inventory. Put that information to use instead of typing it all again.</p></div></article><article><span>02</span><div><h3>Build the job from work you know.</h3><p>Add a saved collection to your estimate, then tailor the quantities and details to this customer’s scope.</p></div></article><article><span>03</span><div><h3>Keep the office work connected.</h3><p>Move from estimating to invoicing with the job details in place, and follow costs and payments in your finances.</p></div></article></div>
        </div>
      </section>
      <section className="ez-cta"><div className="ez-wrap"><p className="ez-eyebrow">LESS RE-ENTRY. MORE TIME BACK.</p><h2>The next job shouldn’t<br />start from scratch.</h2><Link className="ez-button" to="/landing/signup">Get started with EzBoss <ArrowRight size={19} /></Link></div><div className="ez-metal ez-cta-metal" aria-hidden="true" /></section>
    </main>
    <footer className="ez-footer ez-wrap"><Link to="/landing" aria-label="EzBoss home"><Logo /></Link><p>Built for contractors. Connected from start to finish.</p><small>© {new Date().getFullYear()} EzBoss</small></footer>
  </div>
);

export default Landing;
