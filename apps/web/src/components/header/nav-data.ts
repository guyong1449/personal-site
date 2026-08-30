export type NavItem = {
  title: string;
  href: string;
};

export const mainNavItems: NavItem[] = [
  {
    title: "Notes",
    href: "/notes",
  },
  {
    title: "Gallery",
    href: "/gallery",
  },
  {
    title: "Account",
    href: "/account",
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
