import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  padding = true,
  ...props
}) {
  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-soft ${
        hoverEffect ? 'hover:shadow-card hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200' : ''
      } ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
