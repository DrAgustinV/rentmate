import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { useState } from "react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";

export default function MaintenanceCalendar() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { preferences } = useTheme();
  const weekStartDay = preferences?.week_start_day || 'monday';

  const { data: property } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data, error } = await supabase.from("properties").select("title, address").eq("id", propertyId).single();

      if (error) throw error;
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["recurring-schedules", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("recurring_schedules")
        .select(
          `
          *,
          ticket_templates (*)
        `,
        )
        .eq("property_id", propertyId)
        .eq("is_active", true)
        .order("next_run_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
  const rawFirstDay = monthStart.getDay();
  // Adjust based on week start preference
  const firstDayOfWeek = weekStartDay === 'monday' 
    ? (rawFirstDay === 0 ? 6 : rawFirstDay - 1)  // Monday = 0, Sunday = 6
    : rawFirstDay;  // Sunday = 0, Saturday = 6
  
  // Create empty cells for days before the 1st
  const emptyDaysStart = Array(firstDayOfWeek).fill(null);
  
  // Create empty cells to complete the last week
  const totalCells = emptyDaysStart.length + daysInMonth.length;
  const emptyDaysEnd = Array((7 - (totalCells % 7)) % 7).fill(null);

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules?.filter((s) => s.next_run_date === dateStr) || [];
  };

  const frequencyColors = {
    daily: "bg-blue-500",
    weekly: "bg-green-500",
    monthly: "bg-purple-500",
    quarterly: "bg-orange-500",
    yearly: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              >
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers - adjust based on week_start_day */}
            {(weekStartDay === 'monday' 
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            ).map((day) => (
              <div key={day} className="text-center font-semibold p-2">
                {day}
              </div>
            ))}

            {/* Empty cells before the first day */}
            {emptyDaysStart.map((_, index) => (
              <div key={`empty-start-${index}`} className="min-h-[100px] border rounded-lg p-2 bg-muted/30" />
            ))}
            
            {/* Actual days of the month */}
            {daysInMonth.map((day) => {
              const daySchedules = getSchedulesForDate(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    isToday ? "bg-primary/10 border-primary" : "bg-card"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="text-xs p-1 rounded bg-muted truncate"
                        title={schedule.ticket_templates?.title}
                      >
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              frequencyColors[schedule.frequency as keyof typeof frequencyColors]
                            }`}
                          />
                          <span className="truncate">{schedule.ticket_templates?.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Empty cells after the last day to complete the grid */}
            {emptyDaysEnd.map((_, index) => (
              <div key={`empty-end-${index}`} className="min-h-[100px] border rounded-lg p-2 bg-muted/30" />
            ))}
          </div>

          <div className="mt-6 flex gap-4 flex-wrap">
            <div className="text-sm font-medium">Legend:</div>
            {Object.entries(frequencyColors).map(([freq, color]) => (
              <div key={freq} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-sm capitalize">{freq}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
