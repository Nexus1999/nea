import React from 'react';

const NectaLogo = ({ className }: { className?: string }) => {
  return (
    <img 
      src="/images/NECTA.png" 
      alt="NECTA Logo" 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default NectaLogo;