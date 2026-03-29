import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import RecommendationList from "@/components/recommendations/RecommendationList";
import ScheduleClient from "./ScheduleClient";
import WeeklyCheckinBanner from "./_components/WeeklyCheckinBanner";
import { fetchCurrentCheckin } from "../_actions/checkin-actions";

export default async function StudentSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const checkin = await fetchCurrentCheckin();

  return (
    <div>
      <WeeklyCheckinBanner hasCheckin={!!checkin} />
      <RecommendationList userId={effectiveId} />
      <ScheduleClient />
    </div>
  );
}
