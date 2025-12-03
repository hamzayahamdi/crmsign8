"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const opportunityId = params?.id as string;

  useEffect(() => {
    if (opportunityId) {
      // Try to extract contactId from the opportunityId if it follows the pattern
      // Since we don't have the contactId here, redirect to clients list
      router.replace("/clients");
    }
  }, [router, opportunityId]);

  return null;
}
