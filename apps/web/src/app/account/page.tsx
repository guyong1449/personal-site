export const dynamic = "force-static";

export const metadata = {
  title: "Account",
};

const accounts = [
  { service: "X", handle: "@guyong247516", href: "https://x.com/guyong247516" },
  { service: "知乎", handle: "shi-ni-36-76", href: "https://www.zhihu.com/people/shi-ni-36-76" },
  { service: "GitHub", handle: "guyong1449", href: "https://github.com/guyong1449" },
];

export default function AccountPage() {
  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <p className="eyebrow">SECTION / 03</p>
        <h1>ACCOUNT</h1>
        <p>安静的官方入口，仅此三处。其余账号均与本站无关。</p>
        <span>{String(accounts.length).padStart(3, "0")} LINKS</span>
      </header>

      <section aria-label="账号列表" className="account-list">
        {accounts.map((account) => (
          <a
            key={account.href}
            href={account.href}
            target="_blank"
            rel="noopener noreferrer"
            className="account-row"
          >
            <span className="account-row__service">{account.service}</span>
            <span className="account-row__handle">{account.handle}</span>
            <span className="account-row__arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </section>
    </main>
  );
}
