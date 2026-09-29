'use client';

import { forwardRef } from 'react';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { label, error, hint, required, min, max, step = 1, className, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        type="number"
        min={min}
        max={max}
        step={step}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          bg-white
          border-gray-300
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
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
