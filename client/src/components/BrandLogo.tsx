import React from 'react';

const BrandLogo = ({ size = 36 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="10" fill="url(#paint0_linear)" />
        <path d="M18 8C16.8954 8 16 8.89543 16 10V20C16 21.1046 16.8954 22 18 22C19.1046 22 20 21.1046 20 20V10C20 8.89543 19.1046 8 18 8Z" fill="white" />
        <path d="M18 25C21.3137 25 24 22.3137 24 19H26C26 23.4183 22.4183 27 18 27C13.5817 27 10 23.4183 10 19H12C12 22.3137 14.6863 25 18 25Z" fill="white" />
        <path d="M18 27V30" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
        </defs>
    </svg>
);

export default BrandLogo;
