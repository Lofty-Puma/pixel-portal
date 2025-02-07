<script lang="ts">
  import "@fontsource/chakra-petch/300.css";
  import "@fontsource/chakra-petch/400.css";
  import "@fontsource/chakra-petch/500.css";
  import "@fontsource/chakra-petch/600.css";
  import "@fontsource/chakra-petch/700.css";
  import "@fontsource/chakra-petch/300-italic.css";
  import "@fontsource/chakra-petch/400-italic.css";
  import "@fontsource/chakra-petch/500-italic.css";
  import "@fontsource/chakra-petch/600-italic.css";
  import "@fontsource/chakra-petch/700-italic.css";

  import {onMount} from "svelte";
  import {goto} from "$app/navigation";

  import {
    address,
    chainId,
    connectWallet,
    disconnectWallet,
    onChange,
    unwatch,
  } from "$lib/wallet";
  import {page} from "$app/state";
  import WalletConnect from "$lib/WalletConnect.svelte";

  let {children} = $props();

  async function updatePath() {
    // console.log(`update path to /${$chainId}/${$address}`);
    if (page.route.id == "/[chainId]/[address]") {
      let [currentChain, currentAddress] = page.url.pathname
        .split("/")
        .filter((e) => e.length > 0);
      if (currentAddress != $address || parseInt(currentChain) != $chainId) {
        console.log(page.route.id, "pushing page", `/${$chainId}/${$address}`);
        await goto(`/${$chainId}/${$address}`);
      }
    } else if (page.route.id == "/" && !!$address && !!$chainId) {
      await goto(`/${$chainId}/${$address}`);
    }
  }

  onMount(() => {
    onChange(updatePath);
    return () => {
      unwatch();
    };
  });
</script>

<nav>
  <h3>Pixel Portal</h3>
  <WalletConnect connect={connectWallet} disconnect={disconnectWallet} />
</nav>

<div>
  {@render children()}
</div>

<style>
  :global(body) {
    color: #dcdcdc;
    background-color: #131313;
    margin: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  :global(dialog) {
    background-color: transparent;
    max-height: 100vh;
  }

  :global(*) {
    font-family: "Chakra Petch", sans-serif;
  }

  :global(:nth-child(1)) {
    --index: 1;
  }
  :global(:nth-child(2)) {
    --index: 2;
  }
  :global(:nth-child(3)) {
    --index: 3;
  }
  :global(:nth-child(4)) {
    --index: 4;
  }
  :global(:nth-child(5)) {
    --index: 5;
  }
  :global(:nth-child(6)) {
    --index: 6;
  }
  :global(:nth-child(7)) {
    --index: 7;
  }
  :global(:nth-child(8)) {
    --index: 8;
  }
  :global(:nth-child(9)) {
    --index: 9;
  }
  :global(:nth-child(10)) {
    --index: 10;
  }

  nav {
    flex: 0 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8px;
  }

  h3 {
    margin: 1em;
  }

  div {
    flex: 1;
  }
</style>
