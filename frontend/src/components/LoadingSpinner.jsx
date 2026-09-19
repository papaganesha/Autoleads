import React from 'react';

export default function LoadingSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      {message && (
        <p className="mt-4 text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}
