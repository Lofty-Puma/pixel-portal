import { PUBLIC_ALCHEMY_API_KEY } from "$env/static/public";
import { Alchemy, Network } from "alchemy-sdk";

export const alchemy = new Map([
  [
    1,
    new Alchemy({
      apiKey: PUBLIC_ALCHEMY_API_KEY,
      network: Network.ETH_MAINNET,
    }),
  ],
  [
    8453,
    new Alchemy({
      apiKey: PUBLIC_ALCHEMY_API_KEY,
      network: Network.BASE_MAINNET,
    }),
  ],
]);
