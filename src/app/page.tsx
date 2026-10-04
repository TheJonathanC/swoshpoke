'use client';

import dynamic from 'next/dynamic';

const PokerGame = dynamic(() => import('@/components/poker/PokerGame'), {
    ssr: false,
    loading: () => (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                backgroundColor: '#05070a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbc02d',
                fontFamily: 'sans-serif',
                fontSize: '1.25rem',
                fontWeight: 'bold'
            }}
        >
            Loading Swoshpoke...
        </div>
    )
});

export default function Home() {
    return (
        <main className="w-full h-full overflow-hidden">
            <PokerGame />
        </main>
    );
}
