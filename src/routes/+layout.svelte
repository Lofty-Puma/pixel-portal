<script lang="ts">
  import {
    WalletConnect,
    MetaMaskWallet,
    RabbyWallet,
    RainbowWallet,
  } from "@thirdweb-dev/wallets";
  import {PUBLIC_THIRD_WEB_CLIENT_ID} from "$env/static/public";

  let {children} = $props();

  const wallet = new MetaMaskWallet({
    clientId: PUBLIC_THIRD_WEB_CLIENT_ID,
  });
  let walletAddress: String | undefined = $state();

  async function connectWallet() {
    walletAddress = await wallet.connect();
  }

  async function disconnectWallet() {
    await wallet.disconnect();
    walletAddress = undefined;
  }
</script>

<nav>
  <h2>Pixel Portal</h2>
  {#if walletAddress === undefined}
    <button onclick={connectWallet}>Connect Wallet</button>
  {:else}
    <button onclick={disconnectWallet}
      >{walletAddress.substring(0, 3)}...{walletAddress.substring(
        walletAddress.length - 3
      )}</button
    >
  {/if}
</nav>

{@render children()}

<style>
  nav {
    display: flex;
    justify-content: space-between;
  }

  button {
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    transition: background-color 0.3s;
  }
  button:hover {
    background-color: #0056b3;
  }
</style>
