import { fetchRecommendations } from "./recommendation-actions";
import RecommendationCard from "./RecommendationCard";

interface Props {
  userId: string;
}

export default async function RecommendationList({ userId }: Props) {
  const recs = await fetchRecommendations(userId);

  if (recs.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {recs.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
