import { supabase } from "@/lib/_core/supabase";

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
 * Save an award to Supabase for the authenticated user
 */
export async function saveAwardToBackend(award: Award, _sessionToken?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[Awards API] No authenticated user");
      return false;
    }

    const { error } = await supabase.from("user_awards").upsert({
      user_id: user.id,
      award_id: award.id,
      award_name: award.name,
      award_description: award.description,
      award_icon: award.icon,
    }, { onConflict: "user_id,award_id" });

    if (error) {
      console.error("[Awards API] Save error:", error.message);
      return false;
    }
    console.log(`[Awards API] Award saved: ${award.id}`);
    return true;
  } catch (error) {
    console.error("[Awards API] Save error:", error);
    return false;
  }
}

/**
 * Get all awards for the authenticated user
 */
export async function getAwardsFromBackend(_sessionToken?: string): Promise<Award[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[Awards API] No authenticated user");
      return [];
    }

    const { data, error } = await supabase
      .from("user_awards")
      .select("award_id, award_name, award_description, award_icon")
      .eq("user_id", user.id);

    if (error) {
      console.error("[Awards API] Get error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.award_id,
      name: row.award_name,
      description: row.award_description ?? "",
      icon: row.award_icon ?? "",
    }));
  } catch (error) {
    console.error("[Awards API] Get error:", error);
    return [];
  }
}

/**
 * Check if user has a specific award
 */
export async function checkAwardBackend(awardId: string, _sessionToken?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("user_awards")
      .select("award_id")
      .eq("user_id", user.id)
      .eq("award_id", awardId)
      .maybeSingle();

    if (error) {
      console.error("[Awards API] Check error:", error.message);
      return false;
    }
    return data !== null;
  } catch (error) {
    console.error("[Awards API] Check error:", error);
    return false;
  }
}
