'use client';

import { forwardRef, useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, required, className, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  const [focused, setFocused] = useState(false);

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
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          bg-white
          placeholder:text-gray-400
          ${focused ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}
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
