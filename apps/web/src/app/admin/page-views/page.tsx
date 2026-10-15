import { notFound } from "next/navigation";

// Statistics are displayed only in the local Studio, never on the public site.
export default function AdminPageViews() {
  notFound();
}
