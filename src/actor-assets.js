const bundledActorAssets = import.meta.glob("../assets/**/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export function resolveActorUrl(source) {
  if (!source) return source;
  const normalized = source.replace(/^\.\//, "").replace(/^\//, "");
  const match = Object.entries(bundledActorAssets).find(([path]) => path.endsWith(normalized));
  return match?.[1] ?? new URL(source, document.baseURI).href;
}
