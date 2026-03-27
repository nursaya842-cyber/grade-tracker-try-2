import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import RecommendationList from "@/components/recommendations/RecommendationList";
import ScheduleClient from "./ScheduleClient";

export default async function StudentSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  return (
    <div>
      <RecommendationList userId={effectiveId} />
      <ScheduleClient />
    </div>
  );
}
