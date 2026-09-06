/**
 * Default: R3F shell (walls / slabs / stairs / doors).
 * `?houseGltf=1` previews the archived full-house box-bevel GLB.
 */
export function useGltfHouse(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("houseGltf") === "1";
}
