import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  label?: string;
}

export default function LoadingSpinner({ size = 32, label }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner-wrapper">
      <div
        className="loading-spinner"
        style={{ width: size, height: size }}
      />
      {label && <span className="loading-spinner-label">{label}</span>}
    </div>
  );
}
