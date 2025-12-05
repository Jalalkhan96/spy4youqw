import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useEffect, useState } from 'react';

const { chains, publicClient } = configureChains(
    [base, baseSepolia],
    [publicProvider()]
);

const { connectors } = getDefaultWallets({
    appName: 'TrackVerse',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a01e2d3f4b5c6e7f8a9b0c1d2e3f4a5b',
    chains
});

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
});

export default function App({ Component, pageProps }: AppProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <ThemeProvider>
            <WagmiConfig config={wagmiConfig}>
                <RainbowKitProvider
                    chains={chains}
                    theme={darkTheme()}
                >
                    {mounted ? <Component {...pageProps} /> : null}
                </RainbowKitProvider>
            </WagmiConfig>
        </ThemeProvider>
    );
}
