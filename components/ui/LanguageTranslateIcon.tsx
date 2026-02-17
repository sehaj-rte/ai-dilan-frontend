"use client";

import React from "react";

interface LanguageTranslateIconProps {
    className?: string;
}

export const LanguageTranslateIcon: React.FC<LanguageTranslateIconProps> = ({
    className = "h-5 w-5",
}) => {
    return (
        <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Top Left Square - Symbol for character based languages */}
            <rect x="0" y="0" width="312" height="312" rx="64" fill="currentColor" />
            <path
                d="M156 220C172 195 186 160 188 120H220V90H156V60H124V90H60V120H156C154 150 144 180 124 205C110 190 100 175 94 160H64C72 185 88 210 110 230L60 280L80 300L130 250L180 300L200 280L156 236V220Z"
                fill="white"
            />

            {/* Bottom Right Square - Symbol for alphabet based languages */}
            <rect x="200" y="200" width="312" height="312" rx="64" fill="currentColor" />
            <path
                d="M356 260L250 480H285L310 425H400L425 480H460L356 260ZM325 390L356 315L387 390H325Z"
                fill="white"
            />

            {/* Modern Curved Arrows - Top Right going Down */}
            <path
                d="M400 64C440 64 464 88 464 128V145"
                stroke="currentColor"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M434 130L464 160L494 130"
                stroke="currentColor"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Modern Curved Arrows - Bottom Left going Up */}
            <path
                d="M112 448C72 448 48 424 48 384V367"
                stroke="currentColor"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M18 382L48 352L78 382"
                stroke="currentColor"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
