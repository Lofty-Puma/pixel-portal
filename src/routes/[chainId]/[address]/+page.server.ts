import type { Contract } from "$lib/contract";
import {
  parallelAftermathBaseAbi,
  parallelAlphaAbi,
  parallelAlphaBaseAbi,
  parallelAuxiliaryItemsAbi,
  parallelAvatarsAbi,
  parallelBattlePassCardsAbi,
  parallelBattlePassCardsBaseAbi,
  parallelComicsAbi,
  parallelCompanionsAbi,
  parallelCosmeticsAbi,
  parallelEchoesBaseAbi,
  parallelLoreAbi,
  parallelPlanetfallAbi,
  parallelPlanetfallBaseAbi,
  pixelPortalBaseAbi
} from "$lib/generated.js";
import { base, mainnet } from "wagmi/chains";


const parallelAddresses: Map<string, Contract> = new Map([
  ["0xDB12D698e0A96E7D7f3D9ec6BB697A4587E79865", {
    // pixelPortal[base]
    abi: pixelPortalBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
  ["0x0Fc3DD8C37880a297166BEd57759974A157f0E74", {
    // parallelAvatars
    abi: parallelAvatarsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x76BE3b62873462d2142405439777e971754E8E77", {
    // "parallelAlpha",
    abi: parallelAlphaAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x206571b68c66E1d112b74d65695043ad2b5F95D5", {
    // "parallelAlpha[base]",
    abi: parallelAlphaBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
  ["0x273B7Fa510847065A96eb873E9F3142C56d51684", {
    // "parallelEchoes",
    abi: parallelEchoesBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
  ["0x6811f2f20c42f42656A3c8623aD5e9461b83f719", {
    // "parallelPlanetfall",
    abi: parallelPlanetfallAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x8bB4033AF06B363A8391F795A39281bcc3b6197D", {
    // "parallelPlanetfall[base]",
    abi: parallelPlanetfallBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
  ["0xA7B67cD6B31b73772AE3C8ea784317207194A6f4", {
    // "parallelAftermath",
    abi: parallelAftermathBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
  ["0x6E3bc168F6260Ff54257aE4B56449eFd7aFd5934", {
    // "parallelCosmetics",
    abi: parallelCosmeticsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x2dE4941fec832D5d2F7Ab69DF397f3E2fB28d391", {
    // "parallelCompanions",
    abi: parallelCompanionsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x5302A847E53c7b2ff4DaEa7559F82F02446BEE61", {
    // "parallelLore",
    abi: parallelLoreAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x6A82872743217A0988E4d72975D74432CfDeF9D7", {
    // "parallelComics",
    abi: parallelComicsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x38398a2d7A4278b8d83967E0D235164335A0394A", {
    // "parallelAuxiliaryItems",
    abi: parallelAuxiliaryItemsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x9d764bcf1AFFd83554B7626F22EAB2ffC60590C7", {
    // "parallelBattlePassCards",
    abi: parallelBattlePassCardsAbi,
    chainId: mainnet.id,
    chainName: mainnet.name,
  }],
  ["0x504405158f9960A0252a83EE2Fd13167991ADdD6", {
    // "parallelBattlePassCards[base]",
    abi: parallelBattlePassCardsBaseAbi,
    chainId: base.id,
    chainName: base.name,
  }],
]);


export async function load() {
  return {
    parallelAddresses,
  };
}