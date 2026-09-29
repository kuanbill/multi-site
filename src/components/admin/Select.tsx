'use client';

import { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, required, className, id, children, options, placeholder, disabled, ...props },
  ref,
) {
  const fieldId = id ?? props.name;

  const renderOptions = () => {
    if (options) {
      return options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ));
    }
    return children;
  };

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          bg-white
          border-gray-300
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          ${error ? 'border-red-400' : ''}
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
          ${className ?? ''}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {renderOptions()}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
});
