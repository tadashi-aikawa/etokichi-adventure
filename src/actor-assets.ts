const bundledAssets = import.meta.glob<string>(["../assets/**/*.webp", "../assets/**/*.mp3"], {
  eager: true,
  query: "?url",
  import: "default",
});

export function resolveActorUrl(source: string): string {
  if (!source) return source;
  const normalized = source.replace(/^\.\//, "").replace(/^\//, "");
  const match = Object.entries(bundledAssets).find(([path]) => path.endsWith(normalized));
  return match?.[1] ?? new URL(source, document.baseURI).href;
}
