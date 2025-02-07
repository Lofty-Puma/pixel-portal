<script lang="ts">
  import {SvelteMap, SvelteSet} from "svelte/reactivity";
  import Modal from "./Modal.svelte";
  import type {Snippet} from "svelte";
  import type {OwnedNft} from "alchemy-sdk";
  import {
    getAccount,
    getEnsAddress,
    readContracts,
    simulateContract,
    waitForTransactionReceipt,
    writeContract,
    type WriteContractReturnType,
  } from "wagmi/actions";
  import {wagmiConfig} from "./wallet";
  import type {ContractArg} from "./contractArg";
  import type {Contract} from "./contract";
  import {base, mainnet} from "wagmi/chains";
  import {
    ContractFunctionExecutionError,
    type GetEnsAddressReturnType,
  } from "viem";
  import Loading from "./Loading.svelte";
  import {getCallsStatus, sendCalls} from "wagmi/actions/experimental";
  import {pixelPortalBaseAbi} from "./generated";
  import {normalize} from "viem/ens";

  const pixelPortal: Map<number, `0x${string}`> = new Map([
    [mainnet.id, "0x5390967cefE77730Dca5F21C8F7A33528d6C02f6"],
    [base.id, "0x52bA2E4D5934Bb06C5AFAb67B2ddc20718B54e74"],
  ]);

  const baseUrls: Map<number, string> = new Map([
    [mainnet.id, "https://etherscan.io"],
    [base.id, "https://basescan.org"],
  ]);

  function explorerUrl(chainId: number, hash: `0x${string}`) {
    return `${baseUrls.get(chainId)}/tx/${hash}`;
  }

  type Action = () => void;

  abstract class Tab {
    previous?: Tab;
    abstract name: string;
    abstract tag: string;
    abstract icon: string;
    abstract content: Snippet<[...any]>;
    get complete(): boolean {
      return false;
    }
    onLoad(): void {}
    abstract actions: Map<string, Action>;
    is(other: Tab): boolean {
      return other.name == this.name;
    }
    enabled(): boolean {
      return this.previous == undefined || this.previous.complete;
    }
  }

  class Review extends Tab {
    get complete(): boolean {
      return true;
    }
    name: string = "review";
    icon: string = "checklist";
    tag = "Selected Collections";
    actions = new Map([
      [
        "next",
        () => {
          activeTab = approveTab;
          approveTab.onLoad();
        },
      ],
    ]);

    content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>;

    constructor(
      content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>
    ) {
      super();
      this.content = content;
    }
  }

  class Approve extends Tab {
    previous? = reviewTab;
    name: string = "approve";
    icon: string = "done_all";
    tag = "Set Approvals";
    actions = new Map([
      [
        "refresh",
        async () => {
          await this.onLoad();
        },
      ],
      [
        "approve all",
        () => {
          console.log("approve all");
          this._approveContracts(contracts, selectedNFTs);
        },
      ],
    ]);
    content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>;

    get complete(): boolean {
      return (
        this.contractApprovals.size > 0 &&
        this.contractApprovals.values().every((v) => v == true)
      );
    }

    pending = $state(new SvelteSet<string>());

    contractApprovals = $state(new SvelteMap<string, boolean>());

    async onLoad() {
      this.contractApprovals = await this._fetchContractApprovals(
        contracts,
        selectedNFTs
      );
    }

    private async _fetchContractApprovals(
      contracts: Map<string, Contract>,
      selectedNFTs: SvelteMap<string, SvelteMap<OwnedNft, number>>
    ): Promise<SvelteMap<string, boolean>> {
      const mappedSelection = selectedNFTs
        .entries()
        .filter(([contractAddress]) => contracts.has(contractAddress))
        .map(([contractAddress, tokens]) => {
          return {
            contractAddress,
            tokens,
            abi: contracts.get(contractAddress)!.abi,
          };
        })
        .toArray();

      const fetchApprovals: ContractArg[] = mappedSelection.map((s) => {
        return {
          address: s.contractAddress as `0x${string}`,
          abi: s.abi,
          functionName: "isApprovedForAll",
          args: [getAccount(wagmiConfig).address, pixelPortal.get(chainId)],
        };
      });

      const getApprovalResult = await readContracts(wagmiConfig, {
        contracts: fetchApprovals,
      });

      return new SvelteMap(
        getApprovalResult.map((result, i) => {
          const c = mappedSelection[i];
          return [mappedSelection[i].contractAddress, result.result as boolean];
        })
      );
    }

    async approveContract(contractAddress: string) {
      let contract = contracts.get(contractAddress);
      if (!contract) {
        alert(`cannot approve unknown contract ${contractAddress}`);
        return;
      }

      try {
        this.pending.add(contractAddress);
        const result = await writeContract(wagmiConfig, {
          address: contractAddress as `0x${string}`,
          abi: contract.abi,
          functionName: "setApprovalForAll",
          args: [pixelPortal.get(chainId), true],
        });
        result;
      } catch (error) {
        console.log("TXN REJECTED", error);
        if (error instanceof ContractFunctionExecutionError) {
          console.log("TXN FAILED", error);
        }
      } finally {
        this.pending.delete(contractAddress);
      }
    }

    private async _approveContracts(
      contracts: Map<string, Contract>,
      selectedNFTs: SvelteMap<string, SvelteMap<OwnedNft, number>>
    ) {
      const mappedSelection = selectedNFTs
        .entries()
        .filter(
          ([contractAddress]) =>
            (!this.contractApprovals.has(contractAddress) ||
              this.contractApprovals.get(contractAddress) == false) &&
            contracts.has(contractAddress)
        )
        .map(([contractAddress, tokens]) => {
          return {
            contractAddress,
            tokens,
            abi: contracts.get(contractAddress)!.abi,
          };
        })
        .toArray();

      const fetchApprovals: ContractArg[] = mappedSelection.map((s) => {
        this.pending.add(s.contractAddress);
        return {
          address: s.contractAddress as `0x${string}`,
          abi: s.abi,
          functionName: "setApprovalForAll",
          args: [pixelPortal.get(chainId), true],
        };
      });

      try {
        const getApprovalResult = await sendCalls(wagmiConfig, {
          calls: fetchApprovals,
        });

        let status = await getCallsStatus(wagmiConfig, {id: getApprovalResult});

        return new SvelteMap(
          status.receipts!.map((result, i) => {
            const c = mappedSelection[i];
            console.log("isApproved", c.contractAddress, result);
            return [mappedSelection[i].contractAddress, true];
          })
        );
      } catch (error) {
        console.debug("error using sendCalls", error);
        let approvals: WriteContractReturnType[];
        for (let i = 0; i < fetchApprovals.length; i++) {
          const request = fetchApprovals[i];
          const hash = await writeContract(wagmiConfig, request);
          await waitForTransactionReceipt(wagmiConfig, {
            hash,
          });
        }
      } finally {
        this.pending.clear();
        this.onLoad();
        if (this.complete) {
          activeTab = transferTab;
        }
      }
    }

    constructor(
      content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>
    ) {
      super();
      this.content = content;

      this._fetchContractApprovals(contracts, selectedNFTs).then(
        (r) => (this.contractApprovals = r)
      );
    }
  }

  class Transfer extends Tab {
    previous = approveTab;
    name: string = "transfer";
    icon: string = "forward";
    tag = "Send Items";

    actions = new Map([
      [
        "transfer all",
        async () => {
          let mapped = new Map(
            selectedNFTs
              .entries()
              .map<[`0x${string}`, bigint[]]>(([contractAddress, tokens]) => {
                const tokenIds = tokens
                  .keys()
                  .map((token) => BigInt(token.tokenId))
                  .toArray();
                const quantities = tokens
                  .values()
                  .map((q) => BigInt(q))
                  .toArray();
                return [
                  contractAddress as `0x${string}`,
                  this.packData(BigInt(0b0100), tokenIds, quantities),
                ];
              })
              .toArray()
          );
          console.log("transfer all", mapped);

          if (!!destinationAddress || !!destination) {
            let sim = await simulateContract(wagmiConfig, {
              abi: pixelPortalBaseAbi,
              functionName: "bulkTransferERC1155",
              args: [
                (destinationAddress as `0x${string}`) ||
                  (destination as `0x${string}`),
                mapped.keys().toArray(),
                mapped.values().toArray(),
                0b0100,
              ],
              address: pixelPortal.get(chainId) as `0x${string}`,
            });
            console.log("simulation: ", sim);
            let hash = await writeContract(wagmiConfig, sim.request);
            let receipt = await waitForTransactionReceipt(wagmiConfig, {hash});
            confirmTab.transferHash = receipt.transactionHash;
          } else {
            alert("invalid destination address supplied");
          }
        },
      ],
    ]);

    content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>;

    private packData(
      encoding: bigint,
      ids: bigint[],
      amounts: bigint[]
    ): bigint[] {
      const uintSize = 256n;
      // 32-bit values
      // 256 / (0b0100 * 2) = 32
      // 256 / 32 = 8
      const bitSize = uintSize / (encoding * 2n);
      // divide by 2, we are packing values from parallel arrays
      const packedElements = uintSize / bitSize / 2n;

      const packedValues: bigint[] = [];
      for (
        let i = 0n;
        i < Math.ceil(ids.length / Number(packedElements));
        i++
      ) {
        let uint256 = 0n;
        for (let j = 0n; j < packedElements; j++) {
          const tokenID = ids.at(Number(i * packedElements + j)) || 0n;
          const amount = amounts.at(Number(i * packedElements + j)) || 0n;
          uint256 |= tokenID << (bitSize * (j * 2n + 1n));
          uint256 |= amount << (bitSize * j * 2n);
        }
        packedValues.push(uint256);
      }
      return packedValues;
    }

    get complete(): boolean {
      return !!confirmTab.transferHash;
    }

    constructor(
      content: Snippet<[SvelteMap<string, SvelteMap<OwnedNft, number>>]>
    ) {
      super();
      this.content = content;
    }
  }

  class Confirm extends Tab {
    previous = transferTab;
    name: string = "confirm";
    icon: string = "verified";
    tag = "Success";
    transferHash?: `0x${string}`;
    actions = new Map([
      [
        `view transaction${
          this.transferHash
            ? " " +
              this.transferHash?.substring(0, 5) +
              "..." +
              this.transferHash?.substring(this.transferHash.length - 5)
            : ""
        }`,
        () => {
          if (!!this.transferHash) {
            window.open(explorerUrl(chainId, this.transferHash), "_blank");
          }
          window.open(baseUrls.get(chainId), "_blank");
        },
      ],
    ]);
    content: Snippet<[nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>]>;

    get complete(): boolean {
      return !!this.transferHash;
    }

    constructor(
      content: Snippet<[nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>]>
    ) {
      super();
      this.content = content;
    }
  }

  interface Props {
    chainId: number;
    showModal: boolean;
    selectedNFTs: SvelteMap<string, SvelteMap<OwnedNft, number>>;
    contracts: Map<string, Contract>;
  }

  let timer: NodeJS.Timeout | undefined = undefined;
  let timerResolve:
    | ((
        value: `0x${string}` | PromiseLike<`0x${string}` | null> | null
      ) => void)
    | undefined = undefined;

  function resolveENS(name: string | undefined): Promise<`0x${string}` | null> {
    return new Promise((resolve) => {
      if (!!timerResolve) {
        clearTimeout(timer);
        timerResolve(null);
      }
      timerResolve = resolve;
      timer = setTimeout(async () => {
        let address: GetEnsAddressReturnType | null = null;
        try {
          if (
            !!name &&
            name.includes(".") &&
            name.indexOf(".") < name.length - 2
          ) {
            address = await getEnsAddress(wagmiConfig, {
              name: normalize(name),
              chainId: mainnet.id,
            });
          }
        } finally {
          resolve(address);
          timerResolve = undefined;
          timer = undefined;
        }
      }, 750);
    });
  }

  let {
    chainId,
    selectedNFTs,
    contracts,
    showModal = $bindable(),
  }: Props = $props();

  let reviewTab = new Review(review);
  let approveTab = new Approve(approve);
  let transferTab = new Transfer(transfer);
  let confirmTab = new Confirm(confirm);

  let activeTab: Tab = $state(reviewTab);

  let destination: string | undefined = $state();
  let destinationAddress: string | undefined = $state();

  $effect(() => {
    resolveENS(destination).then((address) => {
      destinationAddress = address || undefined;
    });
  });

  let tabs: Tab[] = $state([reviewTab, approveTab, transferTab, confirmTab]);
</script>

{#snippet review(nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>)}
  <div class="collections">
    {#each nfts as [, tokens]}
      {@const metadata = tokens.keys().toArray()[0].contract.openSeaMetadata}
      <div
        class="collection"
        style="background-image: url({metadata.imageUrl});"
        data-count={tokens
          .values()
          .reduce((acc, amount) => (acc += amount))
          .toString()
          .padStart(2, "0")}
      >
        {metadata.collectionName}
        <span class="count"
          >{tokens
            .values()
            .reduce((acc, amount) => (acc += amount))
            .toString()
            .padStart(2, "0")}</span
        >
      </div>
    {/each}
  </div>
{/snippet}

{#snippet approve(nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>)}
  <p>
    You will need to APPROVE PixelPortal to transfer your tokens for you ONCE
    per collection you wish to transfer.
  </p>
  <div class="collections">
    {#await approveTab.contractApprovals}
      {#each nfts as [collection, tokens]}
        {@const metadata = tokens.keys().toArray()[0].contract.openSeaMetadata}
        <div
          class="collection"
          style="background-image: url({metadata.imageUrl});"
          data-count={tokens
            .values()
            .reduce((acc, amount) => (acc += amount))
            .toString()
            .padStart(2, "0")}
        >
          {metadata.collectionName}
          <span class="material-symbols-outlined approval unknown"
            >question_mark</span
          >
        </div>
      {/each}
    {:then approvals}
      {#each nfts as [collection, tokens]}
        {@const metadata = tokens.keys().toArray()[0].contract.openSeaMetadata}
        {@const approved = approvals.get(collection)}
        {@const pending = approveTab.pending.has(collection)}
        <div
          class="collection"
          style="background-image: url({metadata.imageUrl});"
          data-count={tokens
            .values()
            .reduce((acc, amount) => (acc += amount))
            .toString()
            .padStart(2, "0")}
        >
          {#if pending}
            <div class:pending>
              <Loading />
            </div>
          {/if}
          {metadata.collectionName}
          <span
            class="material-symbols-outlined approval {approved == undefined
              ? 'unknown'
              : ''}"
            class:approved
            >{#if approved}verified{:else if approved == undefined}indeterminate_question_box{:else}close{/if}</span
          >
          {#if approved != undefined && !approved && !pending}
            <button
              onclick={(e) => {
                e.preventDefault();
                approveTab.approveContract(collection);
              }}>APPROVE</button
            >
          {/if}
        </div>
      {/each}
    {/await}
  </div>
{/snippet}

{#snippet transfer(nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>)}
  <div class="collections">
    {#each nfts as [, tokens]}
      {@const metadata = tokens.keys().toArray()[0].contract.openSeaMetadata}
      <div
        class="collection"
        style="background-image: url({metadata.imageUrl});"
        data-count={tokens
          .values()
          .reduce((acc, amount) => (acc += amount))
          .toString()
          .padStart(2, "0")}
      >
        {metadata.collectionName}
        <span class="count"
          >{tokens
            .values()
            .reduce((acc, amount) => (acc += amount))
            .toString()
            .padStart(2, "0")}</span
        >
      </div>
    {/each}
  </div>
  <div class="destination" data-ens={destinationAddress}>
    <input
      type="text"
      placeholder="Destination ENS domain or 0x..."
      autocorrect="off"
      spellcheck="false"
      bind:value={destination}
    />
  </div>
{/snippet}

{#snippet confirm(nfts: SvelteMap<string, SvelteMap<OwnedNft, number>>)}
  <div class="collections">
    {#each nfts as [, tokens]}
      {@const metadata = tokens.keys().toArray()[0].contract.openSeaMetadata}
      <div
        class="collection"
        style="background-image: url({metadata.imageUrl});"
        data-count={tokens
          .values()
          .reduce((acc, amount) => (acc += amount))
          .toString()
          .padStart(2, "0")}
      >
        {metadata.collectionName}
        <span class="count"
          >{tokens
            .values()
            .reduce((acc, amount) => (acc += amount))
            .toString()
            .padStart(2, "0")}</span
        >
      </div>
    {/each}
  </div>
  <h3>Success!</h3>
  {#if !!confirmTab.transferHash}
    <p>
      View transaction <a href={explorerUrl(chainId, confirmTab.transferHash)}
        >{confirmTab.transferHash?.substring(
          0,
          5
        )}...{confirmTab.transferHash?.substring(
          confirmTab.transferHash.length - 5
        )}</a
      >
    </p>
  {/if}
  <div><div>Confirm</div></div>
{/snippet}

<Modal bind:showModal>
  {#snippet header()}
    <div id="header">
      <span></span>
      <h2>{activeTab.tag}</h2>
      <button onclick={() => (showModal = false)} id="close">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  {/snippet}
  <div id="modal">
    {#if activeTab instanceof Review}
      {@const content = (activeTab as Review).content}
      {@render content(selectedNFTs)}
    {:else if activeTab instanceof Approve}
      {@const content = (activeTab as Approve).content}
      {@render content(selectedNFTs)}
    {:else if activeTab instanceof Transfer}
      {@const content = (activeTab as Transfer).content}
      {@render content(selectedNFTs)}
    {:else if activeTab instanceof Confirm}
      {@const content = (activeTab as Confirm).content}
      {@render content(selectedNFTs)}
    {/if}
    <div class="actions">
      {#each activeTab.actions as [title, action]}
        <button onclick={action}>{title}</button>
      {/each}
    </div>
  </div>
  {#snippet footer()}
    <div id="footer">
      {#each tabs as tab}
        {@const open = tab.is(activeTab)}
        {@const complete = tab.complete}
        <button
          class="tab {tab.complete ? 'complete' : ''}"
          class:open
          disabled={!tab.enabled()}
          onclick={(e) => {
            e.preventDefault();
            tab.onLoad();
            activeTab = tab;
          }}
        >
          <span class="material-symbols-outlined">{tab.icon}</span>{tab.name}
        </button>
      {/each}
    </div>
  {/snippet}
</Modal>

<style>
  #header {
    text-align: center;
    background-color: #121313;
    color: #dcdcdc;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 1em;
    display: grid;
    grid-template-columns: 36px 1fr 36px;
    align-items: center;
  }

  #header h2 {
    margin: 0;
  }

  #header button {
    color: #dcdcdc;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    font-size: large;
    flex: 0 1;
    display: flex;
    align-items: center;
    justify-content: end;
    width: 36px;
    height: 36px;
  }

  #modal {
    background-color: #121313;
    color: #dcdcdc;
    padding: 1em;
    text-align: center;
    width: 550px;
    max-width: 90vw;
  }

  #modal > .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 20px;
  }

  #modal > .actions > button {
    cursor: pointer;
    background-color: #1153ef;
    border: 0;
    border-radius: 8px;
    width: 100%;
    font-size: x-large;
    text-transform: uppercase;
    margin: 1em 0 0 0;
    padding: 0.25em;
    color: #fff;
    text-shadow: #dcdcdc 0 -5px 10px;
    animation: shadow-breathe 3s linear infinite;
  }

  @keyframes shadow-breathe {
    from {
      text-shadow: #dcdcdc 0 0 1px;
    }
    50% {
      text-shadow: #dcdcdc 0 0 15px;
    }
    to {
      text-shadow: #dcdcdc 0 0 1px;
    }
  }

  #modal .collections {
    display: grid;
    justify-items: center;
    align-items: center;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 30px;
  }

  #modal .collection {
    position: relative;
    width: 100px;
    height: 100px;
    background-size: cover;
    background-position: center;
    background-color: #00000087;
    background-blend-mode: overlay;
    display: flex;
    align-items: center;
    text-shadow: #121313;
    border-radius: 16px;
    padding: 0.5em;
  }

  #modal .collection .pending {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: #000000b0;
    border-radius: 15px;
  }

  #modal .collection .count {
    position: absolute;
    border-radius: 8px;
    top: -10px;
    right: -10px;
    background-color: #1153ef;
    padding: 4px;
  }

  #modal .collection .approval {
    position: absolute;
    border-radius: 8px;
    top: -10px;
    right: -10px;
    background-color: #b20000;
    padding: 4px;
    transition: all 0.25s ease;
  }

  #modal .collection .approval.unknown {
    background-color: #7b7b7b;
  }

  #modal .collection .approval.approved {
    background-color: #0c9b0c;
  }

  #modal .collection button {
    color: #dcdcdc;
    background-color: #1153ef;
    border: 0;
    width: 100%;
    text-align: center;
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5em;
    border-radius: 8px;
  }

  #modal .destination {
    position: relative;
    margin: 1em 1em 0;
    width: 90%;
  }

  #modal .destination::after {
    content: attr(data-ens);
    color: #232323;
    position: absolute;
    left: 18px;
    bottom: -2px;
  }

  #modal .destination input {
    width: 100%;
    padding: 1em;
    background-color: #7b7b7b;
    border: none;
    border-radius: 12px;
    font-size: large;
    position: relative;
  }

  #modal .destination input::placeholder {
    color: #dcdcdc;
  }

  #footer {
    display: grid;
    gap: 5px;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    background-color: #121313;
    color: #111;
    justify-content: center;
    padding: 0 0.5em 0.5em 0.5em;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  #footer .tab {
    cursor: pointer;
    background-color: transparent;
    color: #dcdcdca1;
    padding: 1em;
    border: 0;
    border-top: 2px solid transparent;
    transition: all 0.3s ease;
    display: flex;
    justify-content: space-around;
    align-items: center;
    text-transform: capitalize;
  }

  #footer .tab:hover {
    border-top: 2px solid #dcdcdc;
    color: #dcdcdc;
  }

  #footer .tab.complete {
    border-top: 2px solid #0c9b0c;
    color: #0c9b0c;
  }

  #footer .tab.open {
    border-top: 2px solid #1153ef;
    color: #1153ef;
  }

  #footer button.tab:disabled {
    cursor: not-allowed;
  }

  #footer button.tab:disabled:hover:not(.open) {
    border-top: 2px solid #b20000;
  }

  #footer .tab.open .material-symbols-outlined {
    animation: breathe 2.5s linear infinite normal;
  }

  @keyframes breathe {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.5);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
