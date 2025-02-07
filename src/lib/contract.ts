import type { Abi } from "viem";

export interface Contract {
  abi: Abi;
  chainId: number;
  chainName: string;
}
