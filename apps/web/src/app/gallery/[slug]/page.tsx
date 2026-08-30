import { loadEntry, loadIndex } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import {
  galleryAssetPath,
  galleryCanonicalUrl,
  galleryFilterHref,
  galleryMetadata,
  galleryNavigation,
  gallerySocialImageUrl,
} from "@/lib/gallery";
import { siteConfig } from "@/lib/config";
import { serializeStructuredData } from "@/lib/structured-data";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const gallery = await loadIndex("gallery");
  return gallery.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadEntry("gallery", slug);

  if (!item) {
    return { title: "Gallery Item Not Found" };
  }

  return galleryMetadata(item, siteConfig.url);
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadEntry("gallery", slug);

  if (!item) {
    notFound();
  }

  const gallery = await loadIndex("gallery");
  const navigation = galleryNavigation(gallery, slug, item);
  const coverSrc = galleryAssetPath(item.cover);
  const canonical = galleryCanonicalUrl(siteConfig.url, item.slug);
  const image = gallerySocialImageUrl(siteConfig.url, item.slug, item.cover);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VisualArtwork",
        "@id": `${canonical}#artwork`,
        name: item.title,
        description: item.summary || undefined,
        image: { "@id": `${canonical}#image` },
        artform: item.artCategory || undefined,
        isPartOf: item.series
          ? { "@type": "CreativeWorkSeries", name: item.series }
          : undefined,
        keywords: item.tags.join(", ") || undefined,
        creator: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
        dateCreated: item.created || undefined,
        dateModified: item.updated || undefined,
        url: canonical,
      },
      {
        "@type": "ImageObject",
        "@id": `${canonical}#image`,
        contentUrl: image,
        url: image,
        caption: item.title,
      },
    ],
  };

  return (
    <main id="main-content" className="site-shell archive-page article-page">
      <article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredData(jsonLd) }}
        />
        <header className="article-header">
          {[item.artCategory, item.series].some(Boolean) && (
            <div className="article-meta gallery-taxonomy" aria-label="作品属性">
              {item.artCategory && (
                <Link
                  href={galleryFilterHref("category", item.artCategory)}
                  className="gallery-taxonomy__link"
                >
                  分类 · {item.artCategory}
                </Link>
              )}
              {item.series && (
                <Link
                  href={galleryFilterHref("series", item.series)}
                  className="gallery-taxonomy__link"
                >
                  系列 · {item.series}
                </Link>
              )}
            </div>
          )}
          <h1>{item.title}</h1>
          {item.summary && <p className="article-header__summary">{item.summary}</p>}
          {item.tags.length > 0 && (
            <div className="tag-list" aria-label="标签">
              {item.tags.map((tag) => (
                <Link key={tag} href={galleryFilterHref("tag", tag)}>
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {coverSrc && (
          <div className="article-cover">
            <Image
              src={`/${coverSrc}`}
              alt={`${item.title} 封面`}
              fill
              sizes="(max-width: 900px) 100vw, 1180px"
              priority
            />
          </div>
        )}

        <MarkdownBody content={item.body} />

        {navigation.sameSeries.length > 0 && (
          <section className="gallery-related gallery-related--series" aria-label="同系列作品">
            <h2>同系列</h2>
            <div className="gallery-related__list">
              {navigation.sameSeries.map((entry) => (
                <Link key={entry.slug} href={`/gallery/${entry.slug}`} className="gallery-related__item">
                  <strong>{entry.title}</strong>
                  {entry.summary && <span>{entry.summary}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {navigation.sameCategory.length > 0 && (
          <section className="gallery-related gallery-related--category" aria-label="同分类作品">
            <h2>同分类</h2>
            <div className="gallery-related__list">
              {navigation.sameCategory.map((entry) => (
                <Link key={entry.slug} href={`/gallery/${entry.slug}`} className="gallery-related__item">
                  <strong>{entry.title}</strong>
                  {entry.summary && <span>{entry.summary}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(navigation.previous || navigation.next) && (
          <nav className="post-nav gallery-navigation" aria-label="相邻作品">
            {navigation.previous && (
              <Link href={`/gallery/${navigation.previous.slug}`} className="post-nav__item">
                <span>← 上一件</span>
                <strong>{navigation.previous.title}</strong>
              </Link>
            )}
            {navigation.next && (
              <Link href={`/gallery/${navigation.next.slug}`} className="post-nav__item post-nav__item--right">
                <span>下一件 →</span>
                <strong>{navigation.next.title}</strong>
              </Link>
            )}
          </nav>
        )}

        <div className="article-footer gallery-detail-footer">
          <Link href="/gallery" className="back-link">← BACK TO GALLERY</Link>
        </div>
      </article>
    </main>
  );
}
