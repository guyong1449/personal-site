import siteProfile from "@/lib/site-profile.json";

export const dynamic = "force-static";

export const metadata = {
  title: "Account",
  description: "GUYONG 的公开社交账号与代码主页。",
  alternates: { canonical: "/account" },
};

const accounts = [
  { service: "X", url: "https://x.com/guyong247516" },
  { service: "知乎", url: "https://www.zhihu.com/people/shi-ni-36-76" },
  { service: "GitHub", url: "https://github.com/guyong1449" },
  { service: "研究主页", url: "https://guyong1449.github.io/" },
  ...(siteProfile.linkedin ? [{ service: "LinkedIn", url: siteProfile.linkedin }] : []),
];

export default function AccountPage() {
  return (
    <main id="main-content" className="site-shell archive-page font-family-zh">
      <header className="archive-header">
        <h1>
          <span className="font-family-en" lang="en">ACCOUNT</span>
        </h1>
        <p>Ruoying Wang（GUYONG）的公开账号与联系方式</p>
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
            <span className={`account-row__service ${/^[A-Za-z]+$/.test(account.service) ? "font-family-en" : ""}`}>
              <span
                lang={/^[A-Za-z]+$/.test(account.service) ? "en" : undefined}
              >
                {account.service}
              </span>
            </span>
            <span className="account-row__handle">{account.url}</span>
            <span className="account-row__arrow" aria-hidden="true">↗</span>
          </a>
        ))}
        {!siteProfile.linkedin && <div className="account-row">
          <span className="account-row__service font-family-en" lang="en">LinkedIn</span>
          <span className="account-row__handle">个人主页待补充</span>
        </div>}
        <div className="account-row">
          <span className="account-row__service">微信</span>
          <span className="account-row__handle">wry18851063808</span>
        </div>
      </section>
    </main>
  );
}
