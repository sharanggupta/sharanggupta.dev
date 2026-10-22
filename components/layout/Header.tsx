import Link from "next/link";
import BrandMark from "@/components/brand/BrandMark";
import Container from "@/components/ui/Container";
import { PERSON } from "@/content/person";
import { MENU_ITEMS } from "@/content/sections";
import SiteMenu from "./SiteMenu/SiteMenu";
import ThemeToggle from "./ThemeToggle/ThemeToggle";

/**
 * No top bar: just the mark in the corner (it scrolls away) and a floating round button that
 * opens the full-screen menu, on every screen size. The menu button and the theme toggle are
 * siblings of the header, not children: they must stay on screen and above the open menu.
 */
export default function Header() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-(--z-header)">
        <Container className="flex items-center py-5">
          <Link href="/#top" className="flex items-center gap-2 font-semibold text-accent motion-safe:animate-fade-in">
            <BrandMark size={30} />
            <span className="text-fg">{PERSON.name}</span>
          </Link>
        </Container>
      </header>
      <SiteMenu items={MENU_ITEMS} />
      <ThemeToggle />
    </>
  );
}
