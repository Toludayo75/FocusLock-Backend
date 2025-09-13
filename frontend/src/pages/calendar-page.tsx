import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { AddTaskModal } from "@/components/modals/add-task-modal";
import { Task } from "@/types/task";
import { Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";

export default function CalendarPage() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.startAt), day));
  };

  const getTasksForTimeSlot = (day: Date, hour: number) => {
    return getTasksForDay(day).filter(task => {
      const taskHour = new Date(task.startAt).getHours();
      return taskHour === hour;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const getTaskColor = (task: Task) => {
    switch (task.strictLevel) {
      case 'SOFT': return 'bg-secondary text-secondary-foreground';
      case 'MEDIUM': return 'bg-accent text-accent-foreground';
      case 'HARD': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex items-center space-x-4">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "week" | "month")}>
              <TabsList className="grid grid-cols-2 w-32">
                <TabsTrigger value="week" data-testid="view-week">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="view-month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setShowAddTask(true)} data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigateWeek("prev")}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-week-range">
            {format(weekStart, "MMMM d")} - {format(weekEnd, "d, yyyy")}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigateWeek("next")}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Week View Calendar */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-4 text-sm font-medium text-muted-foreground border-r border-border">
                Time
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-4 text-sm font-medium text-center border-r border-border last:border-r-0">
                  <div>{format(day, "EEE")}</div>
                  <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-primary font-bold' : ''}`}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Time slots */}
            <div className="max-h-96 overflow-y-auto">
              {timeSlots.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-border min-h-16">
                  <div className="p-2 text-sm text-muted-foreground border-r border-border flex items-center">
                    {format(new Date().setHours(hour, 0), "h:mm a")}
                  </div>
                  {weekDays.map((day) => {
                    const dayTasks = getTasksForTimeSlot(day, hour);
                    return (
                      <div key={day.toISOString()} className="p-2 border-r border-border last:border-r-0 min-h-16">
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-2 rounded text-xs cursor-pointer mb-1 ${getTaskColor(task)}`}
                            title={task.title}
                            data-testid={`task-${task.id}`}
                          >
                            {task.title.length > 15 ? task.title.substring(0, 15) + "..." : task.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Task Summary */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">This Week's Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDay(day);
              return (
                <Card key={day.toISOString()} data-testid={`day-summary-${format(day, "yyyy-MM-dd")}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{format(day, "EEEE, MMM d")}</h4>
                      <span className="text-sm text-muted-foreground">{dayTasks.length} tasks</span>
                    </div>
                    {dayTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks scheduled</p>
                    ) : (
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="text-sm">
                            <span className="font-medium">{format(new Date(task.startAt), "h:mm a")}</span>
                            <span className="ml-2">{task.title}</span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{dayTasks.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNavigation currentTab="calendar" />
      
      <AddTaskModal 
        isOpen={showAddTask} 
        onClose={() => setShowAddTask(false)} 
      />
    </div>
  );
}
