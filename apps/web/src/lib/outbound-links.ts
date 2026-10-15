import siteProfile from "./site-profile.json";

// Stable identifiers keep the counters consistent if labels or URLs change.
export const outboundLinks = [
  { id: "email", label: "Email", url: "mailto:rw335@duke.edu" },
  { id: "research", label: "Research", url: "https://guyong1449.github.io/" },
  { id: "github", label: "GitHub", url: "https://github.com/guyong1449" },
  { id: "x", label: "X", url: "https://x.com/guyong247516" },
  { id: "zhihu", label: "知乎", url: "https://www.zhihu.com/people/shi-ni-36-76" },
  ...(siteProfile.linkedin ? [{ id: "linkedin", label: "LinkedIn", url: siteProfile.linkedin }] : []),
  { id: "dkucc-skill", label: "DKUCC Skill", url: "https://github.com/guyong1449/DKUCC-skill" },
  { id: "cisco-autoconnect", label: "Cisco VPN Autoconnect", url: "https://github.com/guyong1449/cisco-vpn-autoconnect" },
  { id: "dku-eat", label: "DKU Annual Eat", url: "https://github.com/guyong1449/DKU-Annual-Eat" },
  { id: "pandoc-gui", label: "Pandoc GUI / Studio", url: "https://github.com/guyong1449/pandoc-GUI" },
];

export function findOutboundLink(href: string) {
  try {
    const url = new URL(href);
    const destination = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");
    return outboundLinks.find((link) => {
      const known = new URL(link.url);
      return `${known.protocol}//${known.host}${known.pathname}`.replace(/\/$/, "") === destination;
    });
  } catch { return undefined; }
}
