import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-stone-50">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-soft text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900">404</h1>
        <h2 className="text-lg font-bold text-stone-800 mt-1">Page Not Found</h2>
        <p className="text-xs text-stone-500 mt-2">
          The property, dashboard, or link you are searching for does not exist or has been relocated.
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button variant="primary" size="md" className="w-full" icon={ArrowLeft}>
              Back to StayPulse Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
