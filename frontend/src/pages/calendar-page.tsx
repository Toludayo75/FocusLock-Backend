import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { Task } from "@/types/schema";
import { ChevronLeft, ChevronRight, Trophy, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, getDay } from "date-fns";

interface HomeStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  streak: number;
  completionRate: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: stats } = useQuery<HomeStats>({
    queryKey: ["/api/stats"],
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the calendar to start on Monday
  const firstDayOfWeek = getDay(monthStart);
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  const paddedDays = Array(startPadding).fill(null).concat(monthDays);

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.startAt), day));
  };

  const getDayCompletionStatus = (day: Date) => {
    const dayTasks = getTasksForDay(day);
    if (dayTasks.length === 0) return 'none';
    
    const completedTasks = dayTasks.filter(task => task.status === 'COMPLETED').length;
    if (completedTasks === dayTasks.length) return 'complete';
    if (completedTasks > 0) return 'partial';
    return 'pending';
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const motivationalQuotes = [
    "The first step is the hardest. No hesitations — you can make it.",
    "Focus is not about doing one thing. It's about doing one thing well.",
    "Progress, not perfection, is the goal.",
    "Every expert was once a beginner. Every professional was once an amateur.",
    "Your future is determined by what you do today, not tomorrow."
  ];

  const todayQuote = motivationalQuotes[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % motivationalQuotes.length];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Calendar Card */}
        <Card className="bg-card/95 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateMonth("prev")}
                data-testid="button-prev-month"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold" data-testid="text-month-year">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateMonth("next")}
                data-testid="button-next-month"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <div key={index} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="aspect-square" />;
                  }

                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const completionStatus = getDayCompletionStatus(day);
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`
                        aspect-square flex items-center justify-center text-sm relative rounded-lg
                        ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                        ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                        ${!isToday && isCurrentMonth ? 'hover:bg-muted' : ''}
                      `}
                      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                    >
                      <span>{format(day, "d")}</span>
                      {/* Completion indicator */}
                      {completionStatus !== 'none' && isCurrentMonth && (
                        <div className={`
                          absolute -top-1 -right-1 w-3 h-3 rounded-full
                          ${completionStatus === 'complete' ? 'bg-green-500' : ''}
                          ${completionStatus === 'partial' ? 'bg-yellow-500' : ''}
                          ${completionStatus === 'pending' ? 'bg-red-500' : ''}
                        `} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">All complete</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">Some complete</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motivational Quote */}
        <Card className="bg-card/95 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-center leading-relaxed">
              {todayQuote}
            </p>
          </CardContent>
        </Card>

        {/* Streak Stats */}
        <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 border-0 shadow-lg text-white overflow-hidden relative">
          <CardContent className="p-6 relative z-10">
            <div className="space-y-4">
              <div>
                <h3 className="text-3xl font-bold">{stats?.streak || 0} days</h3>
                <p className="text-blue-100">Your current streak</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-blue-100">{(stats?.streak || 0) + 3} days</span>
                <span className="text-blue-100">Your longest streak</span>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <TrendingUp className="w-16 h-16" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full opacity-30" />
            <div className="absolute -top-2 -left-2 w-12 h-12 bg-green-400 rounded-full opacity-40" />
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentTab="calendar" />
    </div>
  );
}
