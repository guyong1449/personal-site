export const dynamic = "force-static";

export const metadata = {
  title: "Account",
};

const accounts = [
  { service: "X", url: "https://x.com/guyong247516" },
  { service: "知乎", url: "https://www.zhihu.com/people/shi-ni-36-76" },
  { service: "GitHub", url: "https://github.com/guyong1449" },
];

export default function AccountPage() {
  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <h1>ACCOUNT</h1>
      </header>

      <section aria-label="账号列表" className="account-list">
        {accounts.map((account) => (
          <a
            key={account.url}
            href={account.url}
            target="_blank"
            rel="noopener noreferrer"
            className="account-row"
          >
            <span className="account-row__service">{account.service}</span>
            <span className="account-row__handle">{account.url}</span>
            <span className="account-row__arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </section>
    </main>
  );
}
