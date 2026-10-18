'use client';

import { forwardRef } from 'react';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: 'date' | 'datetime-local' | 'month';
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { label, error, hint, required, type = 'date', className, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        type={type}
        className={`
           min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm
          bg-white
          border-gray-300
           focus:border-blue-500 focus:ring-1 focus:ring-blue-500
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
          ${error ? 'border-red-400' : ''}
          ${props.disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
          ${className ?? ''}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
});
