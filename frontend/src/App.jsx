import React from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import LeadDetailPage from './pages/LeadDetailPage';
import LeadsListPage from './pages/LeadsListPage';
import OutreachKanbanPage from './pages/OutreachKanbanPage';
import DeletionRequestPage from './pages/DeletionRequestPage';
import ApiUsagePill from './components/ApiUsagePill';

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border/60 bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-purple to-accent-cyan">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">
            Auto<span className="text-accent-purple">Leads</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
            }
          >
            Meus Leads
          </NavLink>
          <NavLink
            to="/outreach"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
            }
          >
            Funil de Contato
          </NavLink>
          <ApiUsagePill />
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-charcoal text-gray-100">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_-10%,rgba(139,92,246,0.20),transparent_60%),radial-gradient(ellipse_60%_40%_at_80%_-10%,rgba(6,182,212,0.15),transparent_60%)]"
        />
        <div className="relative z-10">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/results/:searchId" element={<DashboardPage />} />
              <Route path="/lead/:leadId" element={<LeadDetailPage />} />
              <Route path="/leads" element={<LeadsListPage />} />
              <Route path="/outreach" element={<OutreachKanbanPage />} />
              <Route path="/solicitar-remocao" element={<DeletionRequestPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
