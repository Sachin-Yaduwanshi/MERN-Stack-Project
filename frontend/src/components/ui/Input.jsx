import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`block w-full rounded-xl border bg-white dark:bg-stone-800 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-stone-900 transition-all ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950'
              : 'border-stone-200 dark:border-stone-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-200 dark:focus:ring-emerald-950'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {!error && helperText && (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{helperText}</p>
      )}
    </div>
  );
}
