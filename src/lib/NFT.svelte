<script lang="ts">
  import {type OwnedNft} from "alchemy-sdk";
  import Ethereum from "./ethereum.svelte";
  import Base from "./base.svelte";
  import {onMount} from "svelte";

  interface Props {
    nft: OwnedNft;
    quantity: number;
    chainId: number;
    incrementCount: (nft: OwnedNft, quantity?: number) => void;
    decrementCount: (nft: OwnedNft) => void;
  }

  let {
    nft = $bindable({} as OwnedNft),
    chainId = 0,
    quantity = $bindable(0),
    incrementCount,
    decrementCount,
  }: Props = $props();

  let hover = $state(false);
  // let quantity = $state(0);

  function handleQuantityIncrease(
    event: MouseEvent & {
      currentTarget: EventTarget;
    }
  ) {
    event.preventDefault();
    event.stopPropagation();
    quantity = Math.min(quantity + 1, parseInt(nft.balance));
    incrementCount(nft);
  }
  function handleQuantityDecrease(
    event: MouseEvent & {
      currentTarget: EventTarget;
    }
  ) {
    event.preventDefault();
    event.stopPropagation();
    quantity = Math.max(quantity - 1, 0);
    decrementCount(nft);
  }

  function handleMouseEnter() {
    hover = true;
  }

  function handleMouseLeave() {
    hover = false;
  }

  onMount(async () => {});
</script>

<div
  class="card {quantity > 0 ? 'selected' : ''}"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  aria-label={nft.name}
  role="contentinfo"
>
  <div
    class="image-container"
    style="background-image: url({nft.image.originalUrl})"
    aria-label={nft.name}
  >
    <!-- <img src={nft.image.originalUrl} alt={nft.name} /> -->
    <div class="info-overlay {quantity > 0 ? 'selected' : ''}">
      <div class="network-icon">
        {#if chainId == 1}
          <Ethereum />
        {:else if chainId == 8453}
          <Base />
        {/if}
      </div>
      <div class="balance">
        <div>
          {nft.balance}
        </div>
        <span>cop{parseInt(nft.balance) > 1 ? "ies" : "y"}</span>
      </div>
      <h3 class="title">{nft.name}</h3>
      <div class="quantity-selector">
        <button
          class="quantity-button"
          onclick={(event) => handleQuantityDecrease(event)}
        >
          <span class="material-symbols-outlined">do_not_disturb_on</span>
        </button>
        <div id="quantity">{quantity}</div>
        <button class="quantity-button" onclick={handleQuantityIncrease}>
          <span class="material-symbols-outlined">add_circle</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .card {
    width: 200px;
    border: 1px solid #131313;
    border-radius: 12px;
    overflow: hidden;
    margin: 10px;
    transition: all 0.3s ease;
  }

  .card.selected {
    border-color: #007bff;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
  }

  .image-container {
    position: relative;
    background-size: cover;
    background-position: center;
    width: 200px;
    height: auto;
    aspect-ratio: 2/3;
  }

  .info-overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(14, 12, 12, 0.641);
    display: flex;
    flex-direction: column;
    justify-content: end;
  }

  .title {
    margin-bottom: 8px;
    color: var(--text-color);
    padding: 16px;
  }

  .card:hover .info-overlay {
    visibility: visible;
    opacity: 1;
    transition:
      visibility,
      opacity 0.25s ease-in-out;
  }

  .card:not(:hover) .info-overlay:not(.selected) {
    visibility: hidden;
    opacity: 0;
    transition:
      visibility 0.2s,
      opacity 0.2s ease-in-out 0.075s;
  }

  .network-icon {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 40px;
    height: 40px;
    background-color: rgba(159, 159, 159, 0.4);
    border-radius: 50%;
    object-fit: contain;
    z-index: 20;
    display: flex;
    justify-content: center;
  }

  .balance {
    position: absolute;
    top: 8px;
    right: 8px;
    background-color: rgba(159, 159, 159, 0.4);
    border-radius: 4px;
    z-index: 20;
    text-align: center;
    padding: 0.5em 1em;
  }

  .balance div {
    font-size: large;
    font-weight: bolder;
  }

  .balance span {
    font-size: 0.7em;
    font-weight: bold;
    text-transform: uppercase;
  }

  .quantity-selector {
    display: flex;
    justify-content: space-between;
    pointer-events: all;
  }

  .quantity-button {
    height: 50px;
    width: 50px;
    font-size: xx-large;
    padding: 0;
    border: none;
    cursor: pointer;
  }

  .quantity-button:first-child {
    border-top-right-radius: 25%;
  }

  .quantity-button:last-child {
    border-top-left-radius: 25%;
  }

  #quantity {
    text-align: center;
    color: var(--text-color);

    background-color: rgba(159, 159, 159, 0.4);
    border-radius: 4px;
    z-index: 20;
    text-align: center;
    padding: 0.25em;
    font-size: larger;
    font-weight: bolder;
  }

  #quantity::after {
    content: "selected";
    display: block;
    text-transform: uppercase;
    font-size: x-small;
    font-weight: bold;
  }
</style>
