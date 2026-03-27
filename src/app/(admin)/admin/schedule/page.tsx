import { fetchFormOptions } from "../_actions/schedule-actions";
import ScheduleCalendar from "./_components/ScheduleCalendar";

export default async function SchedulePage() {
  const options = await fetchFormOptions();
  return <ScheduleCalendar formOptions={options} />;
}
