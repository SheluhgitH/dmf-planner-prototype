import { getEvents } from "@/lib/data/provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default async function EventsPage() {
  const events = await getEvents();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = now.toLocaleString("default", { month: "long" });

  const eventsByDate = events.reduce<Record<string, typeof events>>(
    (acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    },
    {}
  );

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Events</h1>
        <p className="text-zinc-400">Calendar, RSVPs, and reminders.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {monthName} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2 font-medium">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isToday =
                  day === now.getDate() &&
                  month === now.getMonth() &&
                  year === now.getFullYear();
                return (
                  <div
                    key={day}
                    className={`min-h-16 rounded-lg border p-1 ${
                      isToday
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-800"
                    }`}
                  >
                    <span
                      className={`text-xs ${isToday ? "font-bold text-violet-300" : "text-zinc-400"}`}
                    >
                      {day}
                    </span>
                    {dayEvents.slice(0, 2).map((e) => (
                      <p
                        key={e.id}
                        className="mt-0.5 truncate text-[10px] text-violet-300"
                      >
                        {e.title}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <p className="font-medium text-zinc-200">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    {event.date}
                    {event.time ? ` · ${event.time}` : ""}
                  </p>
                  {event.location && (
                    <p className="text-xs text-zinc-500">{event.location}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
