import { notFound } from "next/navigation";
import { DraftPreview } from "@/components/draft-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "草稿预览", robots: { index: false, follow: false } };

export default function DraftPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DraftPreview />;
}
