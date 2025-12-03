import type { ProjectStatus } from "@/types/client";

/**
 * Update a client's stage and create history entry
 */
export async function updateClientStage(
  clientId: string,
  newStage: ProjectStatus,
  changedBy: string,
): Promise<{ success: boolean; error?: string }> {
  console.log("🔧 [updateClientStage] Starting API call:", {
    clientId,
    newStage,
    changedBy,
    timestamp: new Date().toISOString(),
  });

  try {
    const url = `/api/clients/${clientId}/stage`;
    const payload = { newStage, changedBy };

    console.log("📡 [updateClientStage] Making request:", {
      url,
      method: "POST",
      payload,
      credentials: "include",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    console.log("📨 [updateClientStage] Response received:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseText = await response.text();
    console.log("📄 [updateClientStage] Raw response text:", responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }

      console.error("❌ [updateClientStage] API Error:", {
        status: response.status,
        errorData,
        responseText,
      });

      return {
        success: false,
        error:
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = JSON.parse(responseText);
    console.log("✅ [updateClientStage] Success:", result);

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error("💥 [updateClientStage] Exception:", error);
    return {
      success: false,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Get stage history for a client
 */
export async function getClientStageHistory(clientId: string) {
  try {
    const response = await fetch(`/api/clients/${clientId}/stage`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stage history");
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error fetching stage history:", error);
    return [];
  }
}

/**
 * Get the current active stage for a client from the database
 * This is the source of truth for the client's current stage
 */
export async function getCurrentClientStage(
  clientId: string,
): Promise<ProjectStatus | null> {
  try {
    const history = await getClientStageHistory(clientId);

    // Find the most recent stage with no end date (active stage)
    const activeStage = history.find((entry: any) => !entry.endedAt);

    if (activeStage) {
      return activeStage.stageName as ProjectStatus;
    }

    // If no active stage found, return the most recent stage
    if (history.length > 0) {
      return history[0].stageName as ProjectStatus;
    }

    return null;
  } catch (error) {
    console.error("Error getting current client stage:", error);
    return null;
  }
}
