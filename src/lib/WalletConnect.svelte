<script lang="ts">
  import {
    getConnectors,
    switchChain,
    type GetBalanceReturnType,
    type GetConnectionsReturnType,
  } from "wagmi/actions";
  import Modal from "./Modal.svelte";
  import {wagmiConfig} from "./wallet";
  import {browser} from "$app/environment";
  import type {Connector} from "wagmi";
  import {onMount} from "svelte";
  import Ethereum from "./ethereum.svelte";
  import Base from "./base.svelte";
  import {base, mainnet} from "viem/chains";

  interface Props {
    chainId: number | undefined;
    ensName: string | null;
    address: `0x${string}` | undefined;
    avatarUrl: string | null;
    balance: GetBalanceReturnType | undefined;
    activeConnectors: GetConnectionsReturnType;
    connect: (connector: Connector) => Promise<void>;
    disconnect: (connector: Connector) => Promise<void>;
  }

  let {
    chainId = $bindable(),
    ensName = $bindable(),
    address = $bindable(),
    avatarUrl = $bindable(),
    balance = $bindable(),
    activeConnectors = $bindable(),
    connect,
    disconnect,
  }: Props = $props();

  let showModal = $state(false);
  let copied = $state(false);

  let connectors = $derived(
    getConnectors(wagmiConfig).toSorted((a, b) => {
      if (a.type == "injected" && b.type != "injected") {
        return -1;
      } else if (a.type != "injected" && b.type == "injected") {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    })
  );

  onMount(() => {});
</script>

<button id="connect-button" onclick={() => (showModal = true)}>
  {#if activeConnectors.length > 0}
    <div>
      {ensName ||
        `${address?.substring(0, 5)}...${address?.substring(address.length - 5)}`}{!!balance
        ? ` - ${Number(BigInt(balance?.value) / 10n ** BigInt(balance?.decimals - 2)) / 10 ** 2}`
        : ""} ETH
    </div>
  {:else if !showModal}
    <div>Connect Wallet</div>
  {:else}
    <div>Connecting...</div>
  {/if}
</button>

<Modal bind:showModal>
  {#snippet header()}
    {#if activeConnectors.length > 0}
      <div id="header">
        <button
          onclick={async (e) => {
            e.preventDefault();
            let r = await switchChain(wagmiConfig, {
              chainId: chainId == mainnet.id ? base.id : mainnet.id,
            });
            console.log(r);
          }}
        >
          {#if chainId == mainnet.id}
            <Ethereum />
          {:else if chainId == base.id}
            <Base />
          {/if}
        </button>
        <button onclick={() => (showModal = false)} id="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    {:else}
      <div id="header">
        <div></div>
        <span>Connect Wallet</span>
        <button onclick={() => (showModal = false)} id="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    {/if}
  {/snippet}
  <div id="modal">
    {#if activeConnectors.length > 0}
      <div>
        {#if avatarUrl}
          <img src={avatarUrl} alt={ensName} />
        {/if}
        <h3>
          {ensName ||
            `${address?.substring(0, 5)}...${address?.substring(address.length - 5)}`}
          <button
            class="copy"
            class:copied
            onclick={async (e) => {
              e.preventDefault();
              await navigator.clipboard.writeText(address!);
              copied = true;
              setTimeout(() => {
                copied = false;
              }, 2500);
            }}
          >
            <span class="material-symbols-outlined">content_copy</span>
          </button>
        </h3>
        {#if !!balance}
          <span
            >{Number(
              BigInt(balance?.value) / 10n ** BigInt(balance?.decimals - 2)
            ) /
              10 ** 2} ETH</span
          >
        {/if}
      </div>
      {#each activeConnectors as connection}
        <!-- {#if connection.connector.icon} -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="connector" onclick={() => disconnect(connection.connector)}>
          <img
            src={connection.connector.icon ||
              connectors.findLast((c) => c.id == connection.connector.id)?.icon}
            alt={connection.connector.name}
          />
          <span>{connection.connector.name}</span>
          {#if connection.connector.type === "injected"}
            <div class="injected disconnect"></div>
          {/if}
        </div>
        <!-- {/if} -->
      {/each}
    {:else}
      {#each connectors as connector}
        {#if connector.icon}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="connector" onclick={() => connect(connector)}>
            <img src={connector.icon} alt={connector.name} />
            <span>{connector.name}</span>
            {#if connector.type === "injected"}
              <div class="injected installed"></div>
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
  {#snippet footer()}
    <div id="footer">
      {#if activeConnectors.length == 0}
        <span
          >Don't have a wallet?<a
            href="https://walletguide.walletconnect.network/"
            target="_blank">Get started</a
          ></span
        >
      {/if}
    </div>
  {/snippet}
</Modal>

<style>
  #connect-button {
    font-family: "Chakra Petch", sans-serif;
    background-color: rgb(19, 69, 184);
    color: #dcdcdc;
    font-size: large;
    font-weight: bold;
    border-radius: 24px;
    border-width: 0;
    padding: 12px;
    cursor: pointer;
    min-width: 170px;
  }

  #connect-button:hover {
    background-color: rgb(5, 54, 169);
  }

  #header {
    text-align: center;
    background-color: #121313;
    color: #dcdcdc;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #header div {
    flex: 0 1 33.6px;
  }

  #header span {
    font-size: larger;
    font-weight: bolder;
    /* flex: 2; */
  }

  #header button {
    /* top: 16px;
    right: 16px; */
    color: #dcdcdc;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    font-size: large;
    flex: 0 1;
    display: flex;
    align-items: center;
    justify-content: end;
  }

  #header button {
    width: 36px;
    height: 36px;
  }

  #footer {
    display: flex;
    background-color: #121313;
    color: #dcdcdc;
    justify-content: center;
    padding-bottom: 1em;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  #footer a {
    padding: 0 0.5em;
    color: rgb(47, 91, 194);
  }

  #modal {
    background-color: #121313;
    color: #dcdcdc;
    padding: 1em;
  }

  #modal > div {
    text-align: center;
  }

  #modal > div > h3 {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy {
    position: relative;
    border: 0;
    background-color: transparent;
    color: #dcdcdcad;
    cursor: pointer;
    transition: color 0.25s ease;
  }

  .copy.copied {
    color: rgb(27, 182, 0);
  }

  .copy::after {
    content: " ";
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .copy.copied::after {
    position: absolute;
    bottom: -10px;
    left: 0px;
    right: 0px;
    content: "COPIED";
    font-size: x-small;
    opacity: 1;
  }

  .injected {
    font-size: x-small;
    font-weight: 600;
    color: rgb(27, 182, 0);
    margin: 8px;
    padding: 8px;
    background-color: rgba(27, 182, 0, 0.159);
    border-radius: 12px;
    text-transform: uppercase;
    transition: all 0.3s ease;
  }

  .injected::after {
    content: "CONNECTED";
    padding: 0 0.15em;
  }

  .injected.installed::after {
    content: "INSTALLED";
    padding: 0 0.15em;
  }

  .connector:hover .injected.disconnect::after {
    content: "DISCONNECT";
    color: rgba(214, 27, 27, 0.925);
    padding: 0;
  }

  .connector:hover .injected.disconnect {
    background-color: rgba(182, 0, 0, 0.159);
  }

  .connector {
    display: flex;
    align-items: center;
    padding: 4px;
    margin: 8px;
    background-color: #1d1e1e;
    border-radius: 20px;
    cursor: pointer;
  }

  .connector span {
    padding: 0.75em;
    padding-right: 4em;
    flex: 1;
    font-size: larger;
  }

  .connector img {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    margin-left: 8px;
  }
</style>
