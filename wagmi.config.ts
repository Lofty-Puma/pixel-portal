import { defineConfig } from '@wagmi/cli'
import { fetch } from '@wagmi/cli/plugins'
import { base, mainnet, type Chain } from 'wagmi/chains';

const PUBLIC_THIRD_WEB_CLIENT_ID = process.env["PUBLIC_THIRD_WEB_CLIENT_ID"]!;

interface Contract {
  name: string;
  address: `0x${string}`;
  chain: Chain;
}

const contracts: Contract[] = [
  {
    name: "parallelAvatars",
    address: "0x0Fc3DD8C37880a297166BEd57759974A157f0E74",
    chain: mainnet,
  },
  {
    name: "parallelAlpha",
    address: "0x76BE3b62873462d2142405439777e971754E8E77",
    chain: mainnet,
  },
  {
    name: "parallelAlpha[base]",
    address: "0x206571b68c66E1d112b74d65695043ad2b5F95D5",
    chain: base,
  },
  {
    name: "parallelEchoes[base]",
    address: "0x273B7Fa510847065A96eb873E9F3142C56d51684",
    chain: base,
  },
  {
    name: "parallelPlanetfall",
    address: "0x6811f2f20c42f42656A3c8623aD5e9461b83f719",
    chain: mainnet,
  },
  {
    name: "parallelPlanetfall[base]",
    address: "0x8bB4033AF06B363A8391F795A39281bcc3b6197D",
    chain: base,
  },
  {
    name: "parallelAftermath[base]",
    address: "0xA7B67cD6B31b73772AE3C8ea784317207194A6f4",
    chain: base,
  },
  {
    name: "parallelCosmetics",
    address: "0x6E3bc168F6260Ff54257aE4B56449eFd7aFd5934",
    chain: mainnet,
  },
  {
    name: "parallelCompanions",
    address: "0x2dE4941fec832D5d2F7Ab69DF397f3E2fB28d391",
    chain: mainnet,
  },
  {
    name: "parallelLore",
    address: "0x5302A847E53c7b2ff4DaEa7559F82F02446BEE61",
    chain: mainnet,
  },
  {
    name: "parallelComics",
    address: "0x6A82872743217A0988E4d72975D74432CfDeF9D7",
    chain: mainnet,
  },
  {
    name: "parallelAuxiliaryItems",
    address: "0x38398a2d7A4278b8d83967E0D235164335A0394A",
    chain: mainnet,
  },
  {
    name: "parallelBattlePassCards",
    address: "0x9d764bcf1AFFd83554B7626F22EAB2ffC60590C7",
    chain: mainnet,
  },
  {
    name: "parallelBattlePassCards[base]",
    address: "0x504405158f9960A0252a83EE2Fd13167991ADdD6",
    chain: base,
  },
];

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [
    fetch({
      contracts: contracts.map((contract) => {
        return {
          name: contract.name,
          address: contract.address,
        }
      }),
      async request(contract) {
        const contractApiBaseUrl = "https://contract.thirdweb.com/abi";
        const thirdwebContract = contracts.find((c) => c.address == contract.address)!;
        const headers = new Headers();
        headers.append("x-client-id", PUBLIC_THIRD_WEB_CLIENT_ID)
        return {
          url: `${contractApiBaseUrl}/${thirdwebContract.chain.id}/${thirdwebContract.address}`,
          init: {
            headers
          }
        }
      },
    }),
  ],
});
