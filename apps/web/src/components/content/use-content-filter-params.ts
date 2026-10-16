"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function useContentFilterParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const url = searchParams.toString();
  const [value, setValue] = useState(url);
  const current = useRef(url);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    current.current = url;
    setValue(url);
  }, [url]);

  function updateParams(change: (params: URLSearchParams) => URLSearchParams | void) {
    const draft = new URLSearchParams(current.current);
    const next = (change(draft) ?? draft).toString();
    // Keep rapid checkbox/query changes cumulative while navigation is pending.
    current.current = next;
    setValue(next);
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  return { params: new URLSearchParams(value), updateParams, isPending };
}
