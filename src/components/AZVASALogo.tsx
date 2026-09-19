import React from 'react';

interface AZVASALogoProps {
  variant?: 'login' | 'sidebar' | 'header' | 'mobile' | 'email' | 'compact';
  className?: string;
  showSubtitle?: boolean;
}

export const AZVASALogo: React.FC<AZVASALogoProps> = ({
  variant = 'sidebar',
  className = '',
  showSubtitle = false
}) => {
  // Determine appropriate sizing container based on variant
  // Preserving original 300x100 aspect ratio with object-fit: contain
  let dimensions = 'h-10 w-auto max-w-[170px]';

  switch (variant) {
    case 'login':
      dimensions = 'h-16 md:h-20 w-auto max-w-[260px]';
      break;
    case 'sidebar':
      dimensions = 'h-11 w-auto max-w-[180px]';
      break;
    case 'header':
      dimensions = 'h-9 w-auto max-w-[150px]';
      break;
    case 'mobile':
      dimensions = 'h-8 w-auto max-w-[130px]';
      break;
    case 'email':
      dimensions = 'h-12 w-auto max-w-[180px]';
      break;
    case 'compact':
      dimensions = 'h-7 w-auto max-w-[110px]';
      break;
  }

  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`}>
      <div className="relative flex items-center justify-center p-1">
        <img
          src="/azvasa-logo.png"
          alt="AZVASA"
          className={`${dimensions} object-contain transition-transform`}
          style={{ imageRendering: 'auto' }}
          loading="eager"
        />
      </div>
      {showSubtitle && (
        <div className="mt-1 pl-1">
          <span className="block text-xs font-semibold tracking-wide text-[#084ab8]">
            SalesTrack
          </span>
          <span className="block text-[10px] font-medium text-[#646260]">
            Sales Tracking & Follow-up Management
          </span>
        </div>
      )}
    </div>
  );
};
