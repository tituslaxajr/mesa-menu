import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCafe, getMenu, getCategories, getPlan, isThemeKey } from "@/lib/data";
import { MenuBrowser } from "@/components/app/MenuBrowser";

type Params = { slug: string };
type Search = { theme?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cafe = getCafe(slug);
  if (!cafe) return { title: "Menu not found" };
  return {
    title: `${cafe.name} — Menu`,
    description: `${cafe.name}. ${cafe.tagline}. Browse the menu.`,
  };
}

export default async function CafeMenuPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const { theme: themeParam } = await searchParams;
  const cafe = getCafe(slug);
  if (!cafe) notFound();

  const menu = getMenu(slug);
  const categories = getCategories(slug);
  const plan = getPlan(cafe.plan);
  // Owner's chosen theme, with an optional ?theme= preview override.
  const overridden = isThemeKey(themeParam);
  const theme = overridden ? themeParam : cafe.theme;

  return (
    <MenuBrowser
      cafe={cafe}
      menu={menu}
      categories={categories}
      ordering={!!plan?.ordering}
      plan={cafe.plan}
      theme={theme}
      themeOverridden={overridden}
    />
  );
}
