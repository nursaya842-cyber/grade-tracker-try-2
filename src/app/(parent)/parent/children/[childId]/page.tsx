import { redirect } from "next/navigation";
import { fetchChildDetail } from "../../_actions/parent-actions";
import ChildDetailClient from "./_components/ChildDetailClient";
import { triggerStudentRecommendations } from "@/components/recommendations/recommendation-actions";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const data = await fetchChildDetail(childId);

  if (!data) redirect("/parent/children");

  void triggerStudentRecommendations(childId);

  return <ChildDetailClient data={data} />;
}
