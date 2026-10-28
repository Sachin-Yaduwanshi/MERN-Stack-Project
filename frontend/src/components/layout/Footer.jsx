import React from 'react';
import { Link } from 'react-router-dom';
import { Hotel, ShieldCheck, HeartHandshake, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Hotel className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Stay<span className="text-emerald-400">Pulse</span>
              </span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              Smart hotel discovery, reservation management, and multi-property SaaS platform engineered with MERN architecture.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Strict Role Isolation & Data Privacy</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Explore Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/hotels" className="hover:text-emerald-400 transition-colors">
                  Continue Browsing Hotels
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Guest Reservation Portal
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Create Guest Account
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Safety & Privacy Standards
                </a>
              </li>
            </ul>
          </div>

          {/* Property Owners */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Property Partners
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Register as Property Owner
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Owner Management Dashboard
                </Link>
              </li>
              <li>
                <span className="text-stone-500">Direct Room Pricing & Inventory</span>
              </li>
              <li>
                <span className="text-stone-500">Camera / Photo Verification</span>
              </li>
            </ul>
          </div>

          {/* Architecture / Placement Highlights */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              System Architecture
            </h4>
            <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Placement Portfolio Ready</span>
              </div>
              <p className="text-xs text-stone-400 leading-normal">
                Built with MongoDB, Express, React, Node.js, JWT RBAC, server-side concurrency check, and isolated tenant access.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} StayPulse SaaS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Built with React + Vite + Tailwind</span>
            <span>Security by Design</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
