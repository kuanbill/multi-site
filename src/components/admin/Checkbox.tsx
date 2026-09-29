'use client';

import { forwardRef } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className={`
          h-4 w-4 rounded border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
          ${props.disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${className ?? ''}
        `}
        {...props}
      />
      {label && (
        <label htmlFor={fieldId} className="text-sm select-none cursor-pointer">
          {label}
        </label>
      )}
      {error && <p className="ml-5 text-sm text-red-600">{error}</p>}
    </div>
  );
});
