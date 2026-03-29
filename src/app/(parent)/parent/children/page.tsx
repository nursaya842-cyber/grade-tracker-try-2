import { fetchMyChildren } from "../_actions/parent-actions";
import ChildrenList from "./_components/ChildrenList";

export default async function ChildrenPage() {
  const children = await fetchMyChildren();
  return <ChildrenList children={children} />;
}
