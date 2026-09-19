import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import LeadDetailPage from './pages/LeadDetailPage';

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
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
          <span className="text-lg font-bold text-gray-900">
            Auto
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Leads
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/results/:searchId" element={<DashboardPage />} />
            <Route path="/lead/:leadId" element={<LeadDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
