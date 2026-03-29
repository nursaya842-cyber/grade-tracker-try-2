import { redirect } from "next/navigation";
import { fetchChildDetail } from "../../_actions/parent-actions";
import ChildDetailClient from "./_components/ChildDetailClient";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const data = await fetchChildDetail(childId);

  if (!data) redirect("/parent/children");

  return <ChildDetailClient data={data} />;
}
