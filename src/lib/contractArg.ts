import type { Abi } from "viem";

export interface ContractArg {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: unknown[];
}