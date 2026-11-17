import { Favorites } from "@/components/favorites";
export const metadata = { title: "Избранное", robots: { index: false } };
export default function Page() {
  return (
    <div className="container-shell py-12">
      <h1 className="display mb-8 text-5xl">Избранное</h1>
      <Favorites />
    </div>
  );
}
