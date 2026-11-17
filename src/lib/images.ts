const illustrations: Record<string, string> = {
  "photo-1510915361894-db8b60106cb1": "/images/hero.jpg",
  "photo-1516924962500-2b4b3b99ea02": "/images/hero.jpg",
  "photo-1520523839897-bd0b52f945a0": "/images/keys.jpg",
  "photo-1598488035139-bdbb2231ce04": "/images/studio.jpg",
};
export function imageSource(url?: string): string {
  if (!url) return "/images/hero.jpg";
  if (/^\/media\/[a-z0-9]{20,40}$/.test(url)) return url;
  for (const [id, path] of Object.entries(illustrations))
    if (url.includes(id)) return path;
  if (/^\/images\/(hero|guitar|keys|studio)\.jpg$/.test(url)) return url;
  return url.startsWith("https://images.unsplash.com/")
    ? url
    : "/images/hero.jpg";
}
export function isIllustration(url?: string) {
  return (
    !url ||
    url === "https://unsplash.com" ||
    url.startsWith("/images/") ||
    Object.keys(illustrations).some((id) => url.includes(id))
  );
}
