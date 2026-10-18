'use client';

import { forwardRef } from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, required, className, id, ...props },
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
      <textarea
        ref={ref}
        id={fieldId}
        className={`
           min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm
          bg-white
          placeholder:text-gray-400
          border-gray-300
           focus:border-blue-500 focus:ring-1 focus:ring-blue-500
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
          ${error ? 'border-red-400' : ''}
          ${props.disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
          ${className ?? ''}
        `}
        rows={props.rows ?? 3}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
});
