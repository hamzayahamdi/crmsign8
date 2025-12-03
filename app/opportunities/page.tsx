"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OpportunitiesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to clients page since opportunities are now handled there
    router.replace("/clients");
  }, [router]);

  return null;
}
