/** Thread tension (geometric, 1 = just straight) above which a held pull cuts through standard skin. */
export const STANDARD_CUT_TENSION = 1.35;

/** Cut-through tension for skin of the given toughness (site multiple of standard): the stretch
 * beyond straight that skin tolerates scales with its toughness, so fragile skin cuts through with
 * a firm pull and tough skin needs more. Standard skin (toughness 1) is unchanged. */
export function cutThroughTension(toughness: number) {
  return 1 + (STANDARD_CUT_TENSION - 1) * Math.max(0.2, toughness);
}
