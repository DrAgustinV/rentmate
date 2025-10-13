import { formatDateTime } from "@/lib/dateUtils";
import { Clock, AlertCircle, Flag, UserCheck } from "lucide-react";

interface Activity {
  id: string;
  activity_type: string;
  old_value: any;
  new_value: any;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return <AlertCircle className="h-4 w-4" />;
      case "priority_change":
        return <Flag className="h-4 w-4" />;
      case "assignment_change":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatActivityMessage = (activity: Activity) => {
    const userName = `${activity.profiles.first_name} ${activity.profiles.last_name}`;
    
    switch (activity.activity_type) {
      case "status_change":
        return (
          <>
            <span className="font-medium">{userName}</span> changed status from{" "}
            <span className="font-medium capitalize">{activity.old_value?.status?.replace("_", " ")}</span> to{" "}
            <span className="font-medium capitalize">{activity.new_value?.status?.replace("_", " ")}</span>
          </>
        );
      case "priority_change":
        return (
          <>
            <span className="font-medium">{userName}</span> changed priority from{" "}
            <span className="font-medium capitalize">{activity.old_value?.priority}</span> to{" "}
            <span className="font-medium capitalize">{activity.new_value?.priority}</span>
          </>
        );
      case "assignment_change":
        return (
          <>
            <span className="font-medium">{userName}</span> assigned this ticket
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{userName}</span> updated the ticket
          </>
        );
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {getActivityIcon(activity.activity_type)}
            </div>
            {index < activities.length - 1 && (
              <div className="h-full w-px bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <p className="text-sm">
              {formatActivityMessage(activity)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(activity.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
