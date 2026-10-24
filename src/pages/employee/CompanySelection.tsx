import { ArrowRight, Building2, LogOut } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

export default function CompanySelection() {
  const { memberships, selectCompany, signOut } = useAuthContext();
  const available = memberships.filter(m => m.isActive && m.companyIsActive && (m.kind === 'owner' || m.employeeIsActive));
  return <main className="employee-entry">
    <div className="employee-entry-content">
      <div className="employee-brand"><img src="/EzBossLogo2.png" alt="EzBoss" /></div>
      <section className="employee-panel" aria-labelledby="company-title">
        <div className="employee-icon"><Building2 size={26} aria-hidden="true" /></div>
        <p className="employee-eyebrow">YOUR WORKSPACE</p>
        <h1 id="company-title">Select a company</h1>
        <p className="employee-description">Choose the team you’d like to work with. Your access is specific to each company.</p>
        <div className="employee-company-list">
          {available.map(m => <button className="employee-company" key={m.id} onClick={() => selectCompany(m.id)}>
            <span className="employee-company-icon"><Building2 size={22} aria-hidden="true" /></span>
            <span className="employee-company-copy"><strong>{m.companyName?.trim() || `Company ${m.ownerId}`}</strong><span>{m.kind === 'owner' ? 'Owner workspace' : 'Employee workspace'}</span></span>
            <span className={`employee-role ${m.kind}`}>{m.kind === 'owner' ? 'Owner' : 'Employee'}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>)}
        </div>
        <button className="employee-signout" onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" /> Sign out</button>
      </section>
      <p className="employee-entry-note">Your team. Your work. All connected.</p>
    </div>
  </main>;
}
