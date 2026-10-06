import React from 'react';

export function SuitSpade({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 2C10.5 5 6 9.5 6 13.5C6 16.5 8.2 18 10.5 18C11.5 18 12.3 17.5 13 16.8C12.8 19 13.2 21 15 22H9C10.8 21 11.2 19 11 16.8C11.7 17.5 12.5 18 13.5 18C15.8 18 18 16.5 18 13.5C18 9.5 13.5 5 12 2Z" />
        </svg>
    );
}

export function SuitHeart({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
        </svg>
    );
}

export function SuitDiamond({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 2L3 12L12 22L21 12L12 2Z" />
        </svg>
    );
}

export function SuitClub({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 3C10.3 3 9 4.3 9 6C9 7 9.5 7.9 10.2 8.5C8.9 8.2 6.5 9 6 11C5.5 12.8 7 14.8 9.2 14.8C10.2 14.8 11.1 14.2 11.6 13.5C11.3 16 11.5 19 9 21H15C12.5 19 12.7 16 12.4 13.5C12.9 14.2 13.8 14.8 14.8 14.8C17 14.8 18.5 12.8 18 11C17.5 9 15.1 8.2 13.8 8.5C14.5 7.9 15 7 15 6C15 4.3 13.7 3 12 3Z" />
        </svg>
    );
}

export function TrophyIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
            <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
        </svg>
    );
}

export function HistoryIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}

export function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export function ChipIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" strokeDasharray="2 2" />
            <line x1="12" y1="3" x2="12" y2="7" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="3" y1="12" x2="7" y2="12" />
            <line x1="17" y1="12" x2="21" y2="12" />
        </svg>
    );
}

export function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

export function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
    );
}

export function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
