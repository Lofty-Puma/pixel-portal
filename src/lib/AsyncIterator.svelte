<script lang="ts" generics="K, T">
  import {onMount, type Snippet} from "svelte";
  import {SvelteMap, SvelteSet} from "svelte/reactivity";

  interface Props<K, A> {
    iterable: AsyncIterable<A>;
    getKey(obj: A): K;
    children: Snippet<[K, SvelteSet<T>]>;
  }

  let {iterable, getKey, children}: Props<K, T> = $props();

  let items: SvelteMap<K, SvelteSet<T>> = $state(new SvelteMap());

  onMount(async () => {
    for await (const item of iterable) {
      const key = getKey(item);
      if (!items.has(key)) {
        items.set(key, new SvelteSet([item]));
      } else {
        items.get(key)?.add(item);
      }
    }
  });
</script>

{#each items as [key, item] (key)}
  {@render children(key, item)}
{/each}
