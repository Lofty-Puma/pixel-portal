<script lang="ts">
  import NFT from "$lib/NFT.svelte";
  import {SvelteMap, SvelteSet} from "svelte/reactivity";
  import {alchemy} from "$lib/alchemy.js";
  import type {OwnedNft} from "alchemy-sdk";
  import AsyncIterator from "$lib/AsyncIterator.svelte";
  import {wagmiConfig} from "$lib/wallet.js";
  import {
    getAccount,
    multicall,
    readContracts,
    writeContract,
  } from "wagmi/actions";
  import type {Abi} from "viem";
  import {nfts} from "$lib/NFTs.js";
  import {page} from "$app/state";

  interface ContractArg {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args: any[];
  }

  let {data} = $props();

  let chainId = $derived(parseInt(page.params.chainId));
  let address = $derived(page.params.address as `0x${string}`);

  let ownedNFTs: Promise<SvelteMap<string, SvelteSet<OwnedNft>>> | undefined =
    $state(
      $nfts.getOwnedNFTs(
        parseInt(page.params.chainId),
        page.params.address as `0x${string}`
      )
    );

  // Map<chainId, Map<contractAddress, Map<tokenId, quantity>>>
  let selectedNFTs = $state(new SvelteMap<string, SvelteMap<string, number>>());

  function selectNFT(nft: OwnedNft, quantity: number = 1) {
    // the cascading if blocks allow us to guarantee a property exists at the level it is requested
    if (!selectedNFTs.has(nft.contract.address)) {
      // if we haven't selected any tokens to transfer on this contract
      selectedNFTs.set(
        nft.contract.address,
        new SvelteMap([[nft.tokenId, quantity]])
      );
    } else if (!selectedNFTs.get(nft.contract.address)?.has(nft.tokenId)) {
      // if we haven't selected this token to transfer on this contract
      selectedNFTs.get(nft.contract.address)!.set(nft.tokenId, quantity);
    } else {
      // if we have already selected this token on this contract and want to add more
      let current = selectedNFTs.get(nft.contract.address)!.get(nft.tokenId)!;
      if (current < parseInt(nft.balance))
        selectedNFTs
          .get(nft.contract.address)!
          .set(nft.tokenId, Math.min(parseInt(nft.balance), current + 1));
    }
  }

  function unselectNFT(nft: OwnedNft, quantity: number = 1) {
    let current = selectedNFTs.get(nft.contract.address)?.get(nft.tokenId);
    if (!!current) {
      if (current - quantity <= 0) {
        selectedNFTs?.get(nft.contract.address)?.delete(nft.tokenId);
        if (selectedNFTs?.get(nft.contract.address)?.size == 0) {
          selectedNFTs.delete(nft.contract.address);
        }
      } else {
        selectedNFTs
          ?.get(nft.contract.address)
          ?.set(nft.tokenId, Math.max(0, current - quantity));
      }
    }
  }

  function selectAllNFTs(nfts: SvelteSet<OwnedNft>) {
    nfts.forEach((nft) => selectNFT(nft, parseInt(nft.balance)));
  }

  function unselectAllNFTs(nfts: SvelteSet<OwnedNft>) {
    nfts.forEach((nft) => unselectNFT(nft, parseInt(nft.balance)));
  }

  async function simulateTransfer() {
    const account = getAccount(wagmiConfig);
    const ownAddress = account.address!;

    const mappedSelection = selectedNFTs
      .entries()
      .filter(([contractAddress]) =>
        data.parallelAddresses.has(contractAddress)
      )
      .map(([contractAddress, tokens]) => {
        return {
          contractAddress,
          tokens,
          abi: data.parallelAddresses.get(contractAddress)!.abi,
        };
      })
      .toArray();

    console.log("original selection", mappedSelection);

    const fetchApprovals: ContractArg[] = mappedSelection.map((s) => {
      return {
        address: s.contractAddress as `0x${string}`,
        abi: s.abi,
        functionName: "isApprovedForAll",
        args: [ownAddress, ownAddress],
      };
    });

    const getApprovalResult = await readContracts(wagmiConfig, {
      contracts: fetchApprovals,
    });
    console.log("aprovalResult", getApprovalResult);

    getApprovalResult.forEach(async (result, i) => {
      const c = mappedSelection[i];
      console.log("isApproved", c.contractAddress, result);
      if (result.status == "success" && result.result == false) {
        let r = await writeContract(wagmiConfig, {
          address: c.contractAddress as `0x${string}`,
          abi: c.abi,
          functionName: "setApprovalForAll",
          args: [ownAddress, true],
        });
        console.log(r);
      }
    });

    let approvalTransactions: ContractArg[] = getApprovalResult!
      .map((result, i) => {
        const c = mappedSelection[i];
        console.log("isApproved", c.contractAddress, result);
        if (result.status == "success" && result.result == false) {
          return {
            address: c.contractAddress as `0x${string}`,
            abi: c.abi,
            functionName: "setApprovalForAll",
            args: [ownAddress, true],
          };
        } else {
          return null;
        }
      })
      .filter((entry) => !!entry);

    const transferTransactions: ContractArg[] = mappedSelection.map((s) => {
      return {
        address: s.contractAddress as `0x${string}`,
        abi: s.abi,
        functionName: "safeBatchTransferFrom",
        args: [
          ownAddress,
          "0x${toAddress}",
          s.tokens
            .keys()
            .map((k) => BigInt(k))
            .toArray(),
          s.tokens
            .values()
            .map((v) => BigInt(v))
            .toArray(),
          "0x",
        ],
      };
    });

    console.log([...approvalTransactions, ...transferTransactions]);

    const result = await multicall(wagmiConfig, {
      contracts: [...approvalTransactions, ...transferTransactions],
    });
    console.log(result);
  }

  let selected = $derived(
    selectedNFTs.values().reduce((sum, tokens) => {
      return (
        sum +
        tokens.values().reduce((total, count) => {
          return total + count;
        }, 0)
      );
    }, 0)
  );
</script>

<div class="container">
  <h1>Welcome to Pixel Portal</h1>
  <p>Browsing the collection of {address}.</p>
  {#if selected > 0}
    <button class="action-bar" onclick={simulateTransfer}
      >Transfer {selected} token{selected > 1 ? "s" : ""}</button
    >
  {/if}
  {#await ownedNFTs then nfts_}
    {#if !!nfts_}
      {#each nfts_ as [contractAddress, tokens] (`${contractAddress}:${tokens.values().toArray()[0].contract.openSeaMetadata.collectionSlug}`)}
        {@const collectionMetadata = tokens.values().toArray()[0]}
        <details>
          <summary>
            <img
              src={collectionMetadata.contract.openSeaMetadata.imageUrl}
              alt={collectionMetadata.contract.openSeaMetadata.collectionName}
            />
            <div>
              <h2>
                {collectionMetadata.contract.openSeaMetadata.collectionName ||
                  contractAddress}
              </h2>
              <p>
                {collectionMetadata.contract.openSeaMetadata.description}
              </p>
              <div>
                <span class="label" data-label="owned"
                  >{tokens
                    .values()
                    .reduce((acc, t) => (acc += parseInt(t.balance)), 0)}</span
                >
                <span class="label" data-label="selected"
                  >{selectedNFTs
                    .get(contractAddress)
                    ?.values()
                    .reduce((acc, count) => (acc += count)) || 0}</span
                >
                <span></span>
                <button
                  class="text-button"
                  onclick={(e) => {
                    e.preventDefault();
                    selectAllNFTs(tokens);
                  }}>select all</button
                >
                <button
                  class="text-button"
                  onclick={(e) => {
                    e.preventDefault();
                    unselectAllNFTs(tokens);
                  }}>unselect all</button
                >
              </div>
            </div>
            <span class="material-symbols-outlined">keyboard_arrow_down</span>
          </summary>

          <div class="collection">
            {#each tokens as nft (`${nft.contract.address}:${nft.tokenId}`)}
              <NFT
                {nft}
                {chainId}
                quantity={selectedNFTs
                  .get(nft.contract.address)
                  ?.get(nft.tokenId) || 0}
                incrementCount={selectNFT}
                decrementCount={unselectNFT}
              />
            {/each}
          </div>
        </details>
      {/each}
    {/if}
  {/await}
</div>

<style>
  summary {
    padding: 2em;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  summary > div > * {
    flex: 1;
  }

  summary > div > h2,
  summary > div > p {
    margin: 0;
  }

  summary div {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  summary div div {
    display: grid;
    grid-template-columns: 85px 85px auto 85px 85px;
    column-gap: 25px;
  }

  summary .text-button {
    text-transform: uppercase;
    background-color: transparent;
    border: #285edd solid 1px;
    border-radius: 8px;
    color: #285edd;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  summary .text-button:active {
    background-color: #052a81;
    color: #dcdcdc;
  }

  details {
    user-select: none;
    width: 100%;
  }

  details > summary span.material-symbols-outlined {
    transition: all 0.3s;
    margin-left: auto;
    font-size: xx-large;
  }

  details > summary img {
    width: 110px;
    height: 110px;
    border-radius: 16px;
    margin: 16px;
  }

  details[open] summary span.material-symbols-outlined {
    transform: rotate(180deg);
  }

  details summary span.label {
    position: relative;
    margin-top: 5px;
    margin-right: 50px;
    padding: 18px 0 0 4px;
    border-left: yellow solid 3px;
    font-size: x-large;
  }

  details summary span.label::after {
    position: absolute;
    top: 0;
    left: 4px;
    content: attr(data-label);
    text-transform: uppercase;
    font-size: small;
  }

  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 100px;
  }

  .collection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    justify-content: space-around;
    justify-items: center;
    gap: 10px;
    margin: 1em;
  }

  .action-bar {
    position: fixed;
    bottom: 10px;
    z-index: 30;
    background-color: #007bff;
    padding: 12px;
    border-radius: 8px;
  }
</style>
