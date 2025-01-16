import { NftOrdering, type OwnedNft } from "alchemy-sdk";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { writable } from "svelte/store";
import { alchemy } from "./alchemy";

export class NFTStore {
  // {owner: {chainId: {contractAddress: [OwnedNft]}}
  store: SvelteMap<`0x${string}`, SvelteMap<number, SvelteMap<string, SvelteSet<OwnedNft>>>>;

  constructor() {
    this.store = new SvelteMap<`0x${string}`, SvelteMap<number, SvelteMap<string, SvelteSet<OwnedNft>>>>();
  }

  private fetchOwnedNFTs(chainId: number, address: string): AsyncIterable<OwnedNft> {
    return alchemy.get(chainId)!.nft.getNftsForOwnerIterator(address, {
      pageSize: 100,
      orderBy: NftOrdering.TRANSFERTIME,
      omitMetadata: false,
      contractAddresses: [
        "0x0Fc3DD8C37880a297166BEd57759974A157f0E74",
        "0x206571b68c66E1d112b74d65695043ad2b5F95D5",
        "0x76BE3b62873462d2142405439777e971754E8E77",
        "0x273B7Fa510847065A96eb873E9F3142C56d51684",
        "0x6811f2f20c42f42656A3c8623aD5e9461b83f719",
        "0x8bB4033AF06B363A8391F795A39281bcc3b6197D",
        "0xA7B67cD6B31b73772AE3C8ea784317207194A6f4",
        "0x6E3bc168F6260Ff54257aE4B56449eFd7aFd5934",
        "0x2dE4941fec832D5d2F7Ab69DF397f3E2fB28d391",
        "0x5302A847E53c7b2ff4DaEa7559F82F02446BEE61",
        "0x6A82872743217A0988E4d72975D74432CfDeF9D7",
        "0x38398a2d7A4278b8d83967E0D235164335A0394A",
        "0x9d764bcf1AFFd83554B7626F22EAB2ffC60590C7",
        "0x504405158f9960A0252a83EE2Fd13167991ADdD6",
      ],
    });
  }

  clear() {
    this.store.clear();
  }

  async getOwnedNFTs(chainId: number, address: `0x${string}`): Promise<SvelteMap<string, SvelteSet<OwnedNft>>> {
    console.log("get nfts for account", chainId, address)
    if (this.store.get(address)?.has(chainId)) {
      return this.store.get(address)!.get(chainId)!;
    }

    if (!this.store.has(address)) {
      this.store.set(address, new SvelteMap());
    }

    if (!this.store.get(address)?.has(chainId)) {
      this.store.get(address)?.set(chainId, new SvelteMap());
    }

    // address NFTs not found, fetch them
    const ownedIterable = this.fetchOwnedNFTs(chainId, address);
    setTimeout(async () => {
      const currentMap = this.store.get(address)!.get(chainId)!;

      for await (const item of ownedIterable) {
        const key = item.contract.address as `0x${string}`;
        if (!currentMap.has(key)) {
          currentMap.set(key, new SvelteSet([item]));
        } else {
          currentMap.get(key)?.add(item);
        }
      }
    }, 0)
    return this.store.get(address)!.get(chainId)!;
  }
}

export const nfts = writable(new NFTStore());