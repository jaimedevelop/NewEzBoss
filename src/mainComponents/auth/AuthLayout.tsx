// src/mainComponents/auth/AuthLayout.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import './auth.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackToHome?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackToHome = true,
}) => {
  const { isAuthenticated, signOut } = useAuthContext();

  const handleBackToHome = (e: React.MouseEvent) => {
    if (isAuthenticated) {
      e.preventDefault();
      signOut();
    }
  };

  return (
    <div className="ez-auth">
      <header className="ez-auth-header">
        <span className="ez-auth-logo"><img src="/EzBossLogo.png" alt="EzBoss" /></span>
        {showBackToHome && (
          <Link to="/landing" onClick={handleBackToHome} className="ez-auth-home">
            <ArrowLeft size={16} /> Back to home
          </Link>
        )}
      </header>
      <main className="ez-auth-main">
        <section className="ez-auth-card" aria-labelledby="auth-title">
          <div className="ez-metal ez-auth-rail" aria-hidden="true" />
          <div className="ez-auth-card-content">
            <p className="ez-auth-eyebrow">YOUR WORK. ALL CONNECTED.</p>
            <h1 id="auth-title">{title}</h1>
            <p className="ez-auth-subtitle">{subtitle}</p>
            {children}
          </div>
        </section>
        <aside className="ez-auth-story" aria-label="The EzBoss workflow">
          <p className="ez-auth-eyebrow">BUILT FOR CONTRACTORS</p>
          <h2>Less paperwork.<br /><span>More building.</span></h2>
          <p>Put your imported data and saved collections to work. Keep the next estimate, invoice, and payment connected.</p>
          <ol className="ez-auth-flow">
            {['Inventory', 'Collections', 'Estimates', 'Invoices', 'Finances'].map((name, index) => (
              <li key={name}><span>0{index + 1}</span>{name}{index < 4 && <ArrowRight size={16} aria-hidden="true" />}</li>
            ))}
          </ol>
          <p className="ez-auth-story-note">From the first material to the final payment.</p>
        </aside>
      </main>
      <footer className="ez-auth-footer"><span>Built for the way contractors work.</span><span>© {new Date().getFullYear()} EzBoss</span></footer>
    </div>
  );
};
