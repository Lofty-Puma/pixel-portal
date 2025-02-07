import { goto } from '$app/navigation';
import { page } from '$app/state';
import { writable, type Writable } from 'svelte/store';
import { ConnectorAlreadyConnectedError, createConfig, http, type Connector } from 'wagmi';
import { connect, disconnect, getAccount, getBalance, getChainId, getConnectors, getEnsAvatar, getEnsName, reconnect, watchConnections, type GetBalanceReturnType, type GetConnectionsReturnType, type GetEnsNameReturnType } from 'wagmi/actions';
import { base, mainnet } from 'wagmi/chains';
import {
  coinbaseWallet,
  safe,
} from 'wagmi/connectors';


export const wagmiConfig = createConfig({
  chains: [mainnet, base],
  connectors: [
    coinbaseWallet(),
    safe(),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
})

const connectors = getConnectors(wagmiConfig);

export const address: Writable<`0x${string}` | undefined> = writable();
export const ensName: Writable<string | null> = writable();
export const avatarUrl: Writable<string | null> = writable();
export const balance: Writable<GetBalanceReturnType | undefined> = writable();
export const chainId: Writable<number | undefined> = writable();
export const activeConnectors: Writable<GetConnectionsReturnType> = writable([]);

const callbacks: Array<() => void> = [];

async function populateAccount() {
  const ownAddress = getAccount(wagmiConfig).address;
  const currentChainId = getChainId(wagmiConfig);
  if (ownAddress) {
    address.set(ownAddress);
    chainId.set(currentChainId);
    const ensPromise = new Promise(
      (resolve: (value: Promise<GetEnsNameReturnType> | GetEnsNameReturnType | null) => void) => {
        resolve(getEnsName(wagmiConfig, { address: ownAddress!, chainId: mainnet.id }));
      }
    );
    const [name, b] = await Promise.all([
      ensPromise,
      getBalance(wagmiConfig, { address: ownAddress! }),
    ]);
    balance.set(b)
    ensName.set(name);
    if (name) {
      avatarUrl.set(await getEnsAvatar(wagmiConfig, { name, chainId: mainnet.id }));
    }
  }
}


export async function connectWallet(connector: Connector) {
  if (!connector.disconnect) {
    const result = await reconnect(wagmiConfig, {
      connectors: connectors.filter((con) => con.id === connector.id),
    });
    address.set(result[result.length - 1].accounts[0]);
    chainId.set(result[result.length - 1].chainId);
  } else {
    const result = await connect(wagmiConfig, { connector });
    address.set(result.accounts[0]);
    chainId.set(result.chainId);
  }
}

export async function disconnectWallet(connector: Connector) {
  await disconnect(wagmiConfig, { connector });
  if (page.route.id != "/") {
    await goto(`/`);
  }
}

export async function onChange(f: () => void): Promise<void> {
  callbacks.push(f);
}

export const unwatch = watchConnections(wagmiConfig, {
  async onChange(data) {
    data.forEach(async (connection) => {
      try {
        await connectWallet(connection.connector);
      } catch (e) {
        if (!(e instanceof ConnectorAlreadyConnectedError)) {
          console.log(e);
        }
      }
    });
    activeConnectors.set(data);
    await populateAccount();
    callbacks.forEach((f) => f());
  },
});
