import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { Task } from "@/types/schema";
import { Trophy, Target, Calendar, TrendingUp, CheckCircle, XCircle } from "lucide-react";

interface ProgressStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyData: Array<{
    day: string;
    completed: number;
    total: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    dateEarned: string;
    icon: string;
  }>;
}

export default function ProgressPage() {
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: stats } = useQuery<ProgressStats>({
    queryKey: ["/api/progress/stats"],
  });

  // Use API stats data with fallback to calculated values from tasks
  const totalTasks = stats?.totalTasks ?? tasks.length;
  const completedTasks = stats?.completedTasks ?? tasks.filter(task => task.status === 'COMPLETED').length;
  const failedTasks = stats?.failedTasks ?? tasks.filter(task => task.status === 'FAILED').length;
  const completionRate = stats?.completionRate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  // Use real weekly data from API with fallback to mock data
  const weeklyData = stats?.weeklyData ?? [
    { day: "Mon", completed: 0, total: 0 },
    { day: "Tue", completed: 0, total: 0 },
    { day: "Wed", completed: 0, total: 0 },
    { day: "Thu", completed: 0, total: 0 },
    { day: "Fri", completed: 0, total: 0 },
    { day: "Sat", completed: 0, total: 0 },
    { day: "Sun", completed: 0, total: 0 },
  ];

  // Use real achievements from API with fallback to empty array
  const achievements = stats?.achievements ?? [];

  const getAchievementIcon = (iconType: string) => {
    switch (iconType) {
      case "fire": return <Trophy className="w-6 h-6 text-accent-foreground" />;
      case "target": return <Target className="w-6 h-6 text-accent-foreground" />;
      case "trophy": return <Trophy className="w-6 h-6 text-accent-foreground" />;
      default: return <Trophy className="w-6 h-6 text-accent-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Progress</h1>
        
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-total-tasks">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-completed-tasks">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-secondary mb-2">{completedTasks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-current-streak">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-accent mb-2">{stats?.currentStreak || 7}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-completion-rate">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-destructive mb-2">{completionRate}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Chart */}
        <Card className="mb-8" data-testid="weekly-progress-chart">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {weeklyData.map((day, index) => {
                const completionPercentage = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                return (
                  <div key={day.day} className="flex-1 flex flex-col items-center" data-testid={`chart-day-${index}`}>
                    <div 
                      className="w-full bg-primary rounded-t relative"
                      style={{ height: `${Math.max(completionPercentage * 2, 20)}px` }}
                      title={`${day.completed}/${day.total} tasks completed`}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        {day.completed}/{day.total}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">{day.day}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Task Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card data-testid="completion-breakdown">
            <CardHeader>
              <CardTitle>Task Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{completedTasks}</span>
                  <Badge variant="secondary">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span>Failed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{failedTasks}</span>
                  <Badge variant="destructive">{totalTasks > 0 ? Math.round((failedTasks / totalTasks) * 100) : 0}%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{totalTasks - completedTasks - failedTasks}</span>
                  <Badge variant="outline">{totalTasks > 0 ? Math.round(((totalTasks - completedTasks - failedTasks) / totalTasks) * 100) : 0}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="streak-info">
            <CardHeader>
              <CardTitle>Streak Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Current Streak</span>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <span className="font-semibold">{stats?.currentStreak || 7} days</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Longest Streak</span>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{stats?.longestStreak || 14} days</span>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Keep completing your daily tasks to maintain your streak! You're doing great.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Achievements */}
        <Card data-testid="achievements">
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No achievements yet</p>
                <p className="text-sm">Complete tasks to earn your first achievement</p>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <div key={achievement.id} className="flex items-center space-x-4" data-testid={`achievement-${index}`}>
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                      {getAchievementIcon(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{achievement.dateEarned}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentTab="progress" />
    </div>
  );
}
