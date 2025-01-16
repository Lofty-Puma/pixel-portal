// import { PUBLIC_REOWN_ID } from '$env/static/public';
import { createConfig, http } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import {
  coinbaseWallet,
  safe,
  // walletConnect,
} from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [mainnet, base],
  connectors: [
    // metaMask(),
    coinbaseWallet(),
    safe(),
    // walletConnect({
    //   projectId: PUBLIC_REOWN_ID,
    // }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
})


export const metadata = {
  name: 'PixelPortal',
  description: 'A simple dapp to transfer NFTs in bulk.',
  // url: 'http://localhost', // origin must match your domain & subdomain
  url: 'https://pixels.primea.world', // origin must match your domain & subdomain
  icons: ['./icon.jpg'],
};


