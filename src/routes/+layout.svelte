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
  import {goto, pushState} from "$app/navigation";
  import {nfts} from "$lib/NFTs";
  import {wagmiConfig} from "$lib/wallet";
  import {page} from "$app/state";
  import {
    connect,
    disconnect,
    getAccount,
    getBalance,
    getChainId,
    getConnections,
    getConnectors,
    getEnsAvatar,
    getEnsName,
    reconnect,
    watchConnections,
    type GetBalanceReturnType,
    type GetConnectionsReturnType,
    type GetEnsNameReturnType,
  } from "wagmi/actions";
  import {type Connector} from "wagmi";
  import WalletConnect from "$lib/WalletConnect.svelte";
  import {mainnet} from "viem/chains";

  let {children} = $props();

  const connectors = getConnectors(wagmiConfig);

  let address: `0x${string}` | undefined = $state();
  let ensName: string | null = $state(null);
  let avatarUrl: string | null = $state(null);
  let balance: GetBalanceReturnType | undefined = $state();
  let chainId: number | undefined = $state();
  let activeConnectors: GetConnectionsReturnType = $state([]);

  async function populateAccount() {
    address = getAccount(wagmiConfig).address;
    if (!!address) {
      chainId = getChainId(wagmiConfig);
      let ensPromise = new Promise(
        async (resolve: (value: GetEnsNameReturnType | null) => void) => {
          if (activeConnectors[0].chainId == mainnet.id) {
            resolve(await getEnsName(wagmiConfig, {address: address!}));
          }
          resolve(null);
          return;
        }
      );
      [ensName, balance] = await Promise.all([
        ensPromise,
        getBalance(wagmiConfig, {address}),
      ]);
      if (!!ensName) {
        avatarUrl = await getEnsAvatar(wagmiConfig, {name: ensName});
      }
    }
  }

  async function updatePath() {
    if (page.route.id == "/[chainId]/[address]") {
      let [currentChain, currentAddress] = page.url.pathname
        .split("/")
        .filter((e) => e.length > 0);
      if (currentAddress != address || parseInt(currentChain) != chainId) {
        console.log(page.route.id, "pushing page", `/${chainId}/${address}`);
        await goto(`/${chainId}/${address}`);
      }
    } else if (page.route.id == "/" && !!address && !!chainId) {
      await goto(`/${chainId}/${address}`);
    }
  }

  async function connectWallet(connector: Connector) {
    let chainId: number;

    if (!connector.disconnect) {
      let result = await reconnect(wagmiConfig, {
        connectors: connectors.filter((con) => con.id === connector.id),
      });
      address = result[result.length - 1].accounts[0];
      chainId = result[result.length - 1].chainId;
    } else {
      let result = await connect(wagmiConfig, {connector});
      address = result.accounts[0];
      chainId = result.chainId;
    }

    await populateAccount();

    await updatePath();
  }

  async function disconnectWallet(connector: Connector) {
    await disconnect(wagmiConfig, {connector});
    $nfts.clear();
    if (page.route.id != "/") {
      await goto(`/`);
    }
  }

  async function connectionsChanged(params: GetConnectionsReturnType) {
    activeConnectors = params;
    console.log("Connections changed!", params);
    for (let index = 0; index < activeConnectors.length; index++) {
      const element = activeConnectors[index];
      connectWallet(element.connector);
    }
  }

  const unwatch = watchConnections(wagmiConfig, {
    async onChange(data) {
      console.log("Connections changed!", data);
      chainId = getChainId(wagmiConfig);
      for (let index = 0; index < data.length; index++) {
        const element = data[index];
        if (element.accounts[0] !== address) {
          console.log("connected wallet switched accounts");
          await populateAccount();
        }
      }
      updatePath();
    },
  });

  onMount(() => {
    connectionsChanged(getConnections(wagmiConfig));

    return () => {
      unwatch();
      $nfts.clear();
    };
  });
</script>

<nav>
  <h3>Pixel Portal</h3>
  <WalletConnect
    {chainId}
    {ensName}
    {address}
    {avatarUrl}
    {balance}
    {activeConnectors}
    connect={connectWallet}
    disconnect={disconnectWallet}
  />
</nav>

<div>
  {@render children()}
</div>

<style>
  :global(body) {
    font-family: "Chakra Petch", sans-serif;
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
