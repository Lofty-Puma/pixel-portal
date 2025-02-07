<script lang="ts">
  import NFT from "$lib/NFT.svelte";
  import {SvelteMap, SvelteSet} from "svelte/reactivity";
  import type {NftContractForNft, OwnedNft} from "alchemy-sdk";
  import {nfts} from "$lib/NFTs.js";
  import {page} from "$app/state";
  import {base, mainnet} from "viem/chains";
  import TransferModal from "$lib/TransferModal.svelte";

  let {data} = $props();

  let showModal = $state(false);
  let chainId = $derived(parseInt(page.params.chainId));

  let ownedNFTs: SvelteMap<string, SvelteSet<OwnedNft>> = $state(
    new SvelteMap()
  );

  $effect(() => {
    $nfts
      .getOwnedNFTs(
        page.params.address as `0x${string}`,
        parseInt(page.params.chainId)
      )
      .then((nfts) => (ownedNFTs = nfts));

    return () => {
      ownedNFTs.clear();
      selectedNFTs.clear();
    };
  });

  // Map<chainId, Map<contractAddress, Map<NFT, quantity>>>
  let selectedNFTs: SvelteMap<string, SvelteMap<OwnedNft, number>> = $state(
    new SvelteMap()
  );

  async function getCollectionMetadata(
    chainId: number,
    contract: NftContractForNft
  ): Promise<NftContractForNft> {
    let chainName: string = mainnet.name.toLocaleLowerCase();
    switch (chainId) {
      case mainnet.id:
        break;
      case base.id:
        chainName = base.name.toLocaleLowerCase();
        break;
    }

    if (!contract.openSeaMetadata.collectionName) {
      const contractMetadata = await fetch(
        `/opensea/${chainName}/${contract.address}`
      );
      const contractMetadataJson = await contractMetadata.json();
      contract.openSeaMetadata.collectionSlug =
        contractMetadataJson["collection"];
      contract.openSeaMetadata.collectionName = contractMetadataJson["name"];
      contract.openSeaMetadata.description =
        contractMetadataJson["description"];
      contract.openSeaMetadata.imageUrl = contractMetadataJson["imageUrl"];
    }
    return contract;
  }

  function selectNFT(nft: OwnedNft, quantity: number = 1) {
    // the cascading if blocks allow us to guarantee a property exists at the level it is requested
    if (!selectedNFTs.has(nft.contract.address)) {
      // if we haven't selected any tokens to transfer on this contract
      selectedNFTs.set(nft.contract.address, new SvelteMap([[nft, quantity]]));
    } else if (!selectedNFTs.get(nft.contract.address)?.has(nft)) {
      // if we haven't selected this token to transfer on this contract
      selectedNFTs.get(nft.contract.address)!.set(nft, quantity);
    } else {
      // if we have already selected this token on this contract and want to add more
      let current = selectedNFTs.get(nft.contract.address)!.get(nft)!;
      if (current < parseInt(nft.balance))
        selectedNFTs
          .get(nft.contract.address)!
          .set(nft, Math.min(parseInt(nft.balance), current + 1));
    }
  }

  function unselectNFT(nft: OwnedNft, quantity: number = 1) {
    let current = selectedNFTs.get(nft.contract.address)?.get(nft);
    if (!!current) {
      if (current - quantity <= 0) {
        selectedNFTs?.get(nft.contract.address)?.delete(nft);
        if (selectedNFTs?.get(nft.contract.address)?.size == 0) {
          selectedNFTs.delete(nft.contract.address);
        }
      } else {
        selectedNFTs
          ?.get(nft.contract.address)
          ?.set(nft, Math.max(0, current - quantity));
      }
    }
  }

  function selectAllNFTs(nfts: SvelteSet<OwnedNft>) {
    nfts.forEach((nft) => selectNFT(nft));
  }

  function unselectAllNFTs(nfts: SvelteSet<OwnedNft>) {
    nfts.forEach((nft) => unselectNFT(nft, parseInt(nft.balance)));
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

  let baseGas = $derived(
    (
      ((selectedNFTs.values().reduce((sum, tokens) => {
        sum += tokens.size;
        return sum;
      }, 0) *
        21_000) /
        3_000_000) *
      100
    ).toFixed(0) + "%"
  );
</script>

<div class="container">
  <h1>Welcome to Pixel Portal</h1>
  <p>
    The gas cost increases with the number of token IDs you transfer, not the
    quantity of each token ID.
  </p>
  <p>
    Sending 1000 copies of a token costs the same as sending 1 copy but sending
    1000 different tokens will cost MUCH more.
  </p>
  {#if selected > 0}
    <div class="action-bar" data-gas={baseGas} style="--gas: {baseGas}">
      <span>
        <span><b>{selected}</b> SELECTED</span>
        <span>
          <b>{baseGas}</b> OF MAX
        </span>
      </span>
      <button
        onclick={(e) => {
          e.preventDefault();
          showModal = true;
        }}
        ><span class="material-symbols-outlined"> send </span> Transfer</button
      >
    </div>
  {/if}
  {#each ownedNFTs as [contractAddress, tokens] (`${contractAddress}:${tokens.values().toArray()[0].contract.openSeaMetadata.collectionSlug}`)}
    {@const collectionMetadataPromise = getCollectionMetadata(
      chainId,
      tokens.values().toArray()[0].contract
    )}
    {@const sorted = tokens
      .values()
      .toArray()
      .sort((a, b) => a.name!.localeCompare(b.name!))}
    <details>
      <summary>
        {#await collectionMetadataPromise}
          <div class="image-placeholder"></div>
          <div>
            <h2>
              {contractAddress}
            </h2>
            <p></p>
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
            </div>
          </div>
          <div>
            <button
              class="text-button"
              onclick={(e) => {
                e.preventDefault();
                selectAllNFTs(tokens);
              }}>+1 of each</button
            >
            <button
              class="text-button"
              onclick={(e) => {
                e.preventDefault();
                unselectAllNFTs(tokens);
              }}>-1 of each</button
            >
          </div>
        {:then collectionMetadata}
          <img
            src={collectionMetadata.openSeaMetadata.imageUrl}
            alt={collectionMetadata.openSeaMetadata.collectionName}
          />
          <div class="info">
            <h2>
              {collectionMetadata.openSeaMetadata.collectionName ||
                contractAddress}
            </h2>
            <p>
              {collectionMetadata.openSeaMetadata.description}
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
            </div>
          </div>
          <div>
            <button
              class="text-button"
              onclick={(e) => {
                e.preventDefault();
                selectAllNFTs(tokens);
              }}>+1 of each</button
            >
            <button
              class="text-button"
              onclick={(e) => {
                e.preventDefault();
                unselectAllNFTs(tokens);
              }}>-1 of each</button
            >
          </div>
        {/await}
        <span class="material-symbols-outlined">keyboard_arrow_down</span>
      </summary>

      <div class="collection">
        {#each sorted as nft (`${nft.contract.address}:${nft.tokenId}`)}
          <NFT
            {nft}
            {chainId}
            quantity={selectedNFTs.get(nft.contract.address)?.get(nft) || 0}
            incrementCount={selectNFT}
            decrementCount={unselectNFT}
          />
        {/each}
      </div>
    </details>
  {/each}
</div>

<TransferModal
  {chainId}
  {selectedNFTs}
  contracts={data.parallelAddresses}
  bind:showModal
/>

<style>
  summary {
    padding: 2em;
    cursor: pointer;
    display: flex;
    align-items: stretch;
  }

  summary > div > * {
    flex: 1;
  }

  summary > div > h2,
  summary > div > p {
    margin: 0;
  }

  summary div.info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 1em;
  }

  summary div:not(.info) {
    display: grid;
    gap: 10px;
    min-width: 90px;
  }

  summary div div {
    display: grid;
    grid-template-columns: 85px 85px auto 85px 85px;
    column-gap: 25px;
  }

  summary .text-button {
    text-transform: uppercase;
    background-color: #285edd;
    border: #285edd solid 1px;
    border-radius: 8px;
    color: #dcdcdc;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
    font-weight: bold;
  }

  summary .text-button:active {
    background-color: #052a81;
    color: #dcdcdc;
  }

  summary span {
    display: flex;
    align-items: center;
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

  details .image-placeholder {
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWw6c3BhY2U9InByZXNlcnZlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeT0iMCIgeD0iMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iTGF5ZXJfMSIgdmVyc2lvbj0iMS4xIiBzdHlsZT0ibWFyZ2luOiBpbml0aWFsOyBkaXNwbGF5OiBibG9jazsgc2hhcGUtcmVuZGVyaW5nOiBhdXRvOyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDApOyIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZyBjbGFzcz0ibGRsLXNjYWxlIiBzdHlsZT0idHJhbnNmb3JtLW9yaWdpbjogNTAlIDUwJTsgdHJhbnNmb3JtOiByb3RhdGUoMGRlZykgc2NhbGUoMC44LCAwLjgpOyI+PGcgY2xhc3M9ImxkbC1hbmkiIHN0eWxlPSJ0cmFuc2Zvcm0tYm94OiB2aWV3LWJveDsiPjxnIGNsYXNzPSJsZGwtbGF5ZXIiPjxnIGNsYXNzPSJsZGwtYW5pIiBzdHlsZT0idHJhbnNmb3JtLWJveDogdmlldy1ib3g7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybS1vcmlnaW46IDUwcHggNTBweDsgdHJhbnNmb3JtOiBtYXRyaXgzZCgwLjkxLCAwLCAwLCAwLCAwLCAwLjkxLCAwLCAwLCAwLCAwLCAwLjkxLCAwLCAwLCAwLCAwLCAxKTsgYW5pbWF0aW9uOiAxcyBsaW5lYXIgLTAuNjI1cyBpbmZpbml0ZSBub3JtYWwgZm9yd2FyZHMgcnVubmluZyBhbmltYXRlOyI+PHBhdGggZD0iTTE5LjMxIDkuNDF2ODEuMThoNjEuMzhWMjguMTUzTDYxLjk0NyA5LjQxeiIgZmlsbD0iI2UwZTBlMCIgc3R5bGU9InN0cm9rZS13aWR0aDogMC45OTsgZmlsbDogcmdiKDIyNCwgMjI0LCAyMjQpOyI+PC9wYXRoPjwvZz48L2c+PGcgY2xhc3M9ImxkbC1sYXllciI+PGcgY2xhc3M9ImxkbC1hbmkiIHN0eWxlPSJ0cmFuc2Zvcm0tYm94OiB2aWV3LWJveDsgb3BhY2l0eTogMTsgdHJhbnNmb3JtLW9yaWdpbjogNTBweCA1MHB4OyB0cmFuc2Zvcm06IG1hdHJpeDNkKDAuOTEsIDAsIDAsIDAsIDAsIDAuOTEsIDAsIDAsIDAsIDAsIDAuOTEsIDAsIDAsIDAsIDAsIDEpOyBhbmltYXRpb246IDFzIGxpbmVhciAtMC43NXMgaW5maW5pdGUgbm9ybWFsIGZvcndhcmRzIHJ1bm5pbmcgYW5pbWF0ZTsiPjxwYXRoIGQ9Ik04MC41MzcgMjhMNjIgOS40NjNWMjh6IiBmaWxsPSIjNjU2NjY2IiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAwLjk5OyBmaWxsOiByZ2IoMTAxLCAxMDIsIDEwMik7Ij48L3BhdGg+PC9nPjwvZz48ZyBjbGFzcz0ibGRsLWxheWVyIj48ZyBjbGFzcz0ibGRsLWFuaSIgc3R5bGU9InRyYW5zZm9ybS1ib3g6IHZpZXctYm94OyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm0tb3JpZ2luOiA1MHB4IDUwcHg7IHRyYW5zZm9ybTogbWF0cml4M2QoMC45MSwgMCwgMCwgMCwgMCwgMC45MSwgMCwgMCwgMCwgMCwgMC45MSwgMCwgMCwgMCwgMCwgMSk7IGFuaW1hdGlvbjogMXMgbGluZWFyIC0wLjg3NXMgaW5maW5pdGUgbm9ybWFsIGZvcndhcmRzIHJ1bm5pbmcgYW5pbWF0ZTsiPjxwYXRoIGZpbGw9IiMzMjMyMzIiIGQ9Ik02MS4yNjEgNTMuNTQ4bDExLjEwMyAxNC4zMjdjLjI5Mi4zNzcuNDUxLjg0LjQ1MSAxLjMxN3YxNC40MDVIMjYuMzY4di03Ljg0YzAtLjQ1Mi4xNDItLjg5Mi40MDYtMS4yNThsNy4zNTYtMTAuMTk2YTIuMzU2IDIuMzU2IDAgMCAxIDMuNTg0LS4yNzlsNS45NzEgNi4wMzMgMTMuOTEtMTYuNTgxYTIuMzU3IDIuMzU3IDAgMCAxIDMuNjY2LjA3MnoiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDAuOTk7IGZpbGw6IHJnYig1MCwgNTAsIDUwKTsiPjwvcGF0aD48L2c+PC9nPjxnIGNsYXNzPSJsZGwtbGF5ZXIiPjxnIGNsYXNzPSJsZGwtYW5pIiBzdHlsZT0idHJhbnNmb3JtLWJveDogdmlldy1ib3g7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybS1vcmlnaW46IDUwcHggNTBweDsgdHJhbnNmb3JtOiBtYXRyaXgzZCgwLjkxLCAwLCAwLCAwLCAwLCAwLjkxLCAwLCAwLCAwLCAwLCAwLjkxLCAwLCAwLCAwLCAwLCAxKTsgYW5pbWF0aW9uOiAxcyBsaW5lYXIgLTFzIGluZmluaXRlIG5vcm1hbCBmb3J3YXJkcyBydW5uaW5nIGFuaW1hdGU7Ij48Y2lyY2xlIGZpbGw9IiMzMjMyMzIiIHI9IjcuMTk5IiBjeT0iNTAiIGN4PSIzNy4wMjgiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDAuOTk7IGZpbGw6IHJnYig1MCwgNTAsIDUwKTsiPjwvY2lyY2xlPjwvZz48L2c+PG1ldGFkYXRhIHhtbG5zOmQ9Imh0dHBzOi8vbG9hZGluZy5pby9zdG9jay8iPjwvbWV0YWRhdGE+PC9nPjwvZz48L3N2Zz4=");
    background-position: center;
    background-repeat: no-repeat;
    width: 110px;
    height: 110px;
    border-radius: 16px;
    margin: 16px;
    flex-grow: inherit;
  }

  details > summary img {
    width: 110px;
    height: 110px;
    border-radius: 16px;
    margin: 16px;
    object-fit: cover;
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
    /* background-color: #007bff; */
    background: #007bff;
    /* background: #007bff linear-gradient(to right, #119421 50%, #e02d2d 100%); */
    color: black;
    padding: 0.25em;
    border-radius: 8px;
    display: flex;
    align-items: center;
  }
  .action-bar button {
    background-color: #007bff;
    padding: 12px;
    margin: 0.25em;
    border-radius: 8px;
    border: black 1px solid;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .action-bar > span {
    display: flex;
    flex-direction: column;
  }
</style>
