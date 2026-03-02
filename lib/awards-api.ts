import { getApiBaseUrl } from "@/constants/oauth";

/**
 * Award data structure
 */
export interface Award {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Save an award to the backend database
 */
export async function saveAwardToBackend(award: Award, sessionToken: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[Awards API] No API base URL configured");
      return false;
    }

    const response = await fetch(`${baseUrl}/api/awards/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        awardId: award.id,
        awardName: award.name,
        awardDescription: award.description,
        awardIcon: award.icon,
      }),
    });

    if (!response.ok) {
      console.error(`[Awards API] Save failed with status ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`[Awards API] Award saved: ${award.id}`, data);
    return data.success;
  } catch (error) {
    console.error("[Awards API] Save error:", error);
    return false;
  }
}

/**
 * Get all awards for the current user
 */
export async function getAwardsFromBackend(sessionToken: string): Promise<Award[]> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[Awards API] No API base URL configured");
      return [];
    }

    const response = await fetch(`${baseUrl}/api/awards/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[Awards API] Get failed with status ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.awards || [];
  } catch (error) {
    console.error("[Awards API] Get error:", error);
    return [];
  }
}

/**
 * Check if user has a specific award
 */
export async function checkAwardBackend(awardId: string, sessionToken: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn("[Awards API] No API base URL configured");
      return false;
    }

    const response = await fetch(`${baseUrl}/api/awards/check/${awardId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[Awards API] Check failed with status ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.hasAward || false;
  } catch (error) {
    console.error("[Awards API] Check error:", error);
    return false;
  }
}
