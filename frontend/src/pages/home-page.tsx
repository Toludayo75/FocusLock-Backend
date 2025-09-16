import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { TutorialSystem, firstTimeTutorialSteps, useTutorial } from "@/components/onboarding/tutorial-system";
import { Task } from "@/types/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobileEnforcement } from "@/hooks/use-mobile-enforcement";
import { CheckCircle, Clock, Flame, Target } from "lucide-react";
import { format } from "date-fns";

interface HomeStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  streak: number;
  completionRate: number;
}

export default function HomePage() {
  const { showTutorial, startTutorial, closeTutorial, completeTutorial } = useTutorial();
  const { toast } = useToast();
  const mobileEnforcement = useMobileEnforcement();
  
  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "today"],
  });

  const { data: stats } = useQuery<HomeStats>({
    queryKey: ["/api/stats"],
  });

  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, pdfWindow }: { taskId: string, pdfWindow?: Window | null }) => {
      // Update status to ACTIVE
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: "ACTIVE" });
      
      // Get the full task details
      const taskResponse = await apiRequest("GET", `/api/tasks/${taskId}`);
      return { task: taskResponse.data, pdfWindow };
    },
    onSuccess: async ({ task: startedTask, pdfWindow }: { task: Task, pdfWindow?: Window | null }) => {
      // 1. Open PDF if it exists
      if (startedTask.pdfFileUrl && pdfWindow) {
        pdfWindow.location.href = startedTask.pdfFileUrl;
        console.log("📄 Opening PDF:", startedTask.pdfFileUrl);
      }
      
      // 2. Start enforcement with task parameters
      const enforcementStarted = await mobileEnforcement.startEnforcement({
        strictLevel: startedTask.strictLevel,
        targetApps: startedTask.targetApps,
        durationMinutes: startedTask.durationMinutes
      });
      
      if (enforcementStarted) {
        console.log(`🔒 Enforcement started: ${startedTask.strictLevel} level for ${startedTask.durationMinutes} minutes`);
      }
      
      // 3. Show success notification
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task started",
        description: enforcementStarted ? 
          (startedTask.pdfFileUrl ? "PDF opened and enforcement active!" : "Task active with enforcement!") :
          (startedTask.pdfFileUrl ? "PDF opened (enforcement failed)" : "Task started (enforcement failed)")
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completedToday = todayTasks.filter(task => task.status === 'COMPLETED').length;
  const totalToday = todayTasks.length;

  const getStrictLevelColor = (level: string) => {
    switch (level) {
      case 'SOFT': return 'bg-secondary text-secondary-foreground';
      case 'MEDIUM': return 'bg-accent text-accent-foreground';
      case 'HARD': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-secondary';
      case 'ACTIVE': return 'text-primary';
      case 'PENDING': return 'text-muted-foreground';
      case 'FAILED': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const nextTask = todayTasks.find(task => task.status === 'PENDING');

  // Start tutorial for first-time users
  useEffect(() => {
    // Small delay to let the page load before showing tutorial
    const timer = setTimeout(() => {
      startTutorial();
    }, 1000);

    return () => clearTimeout(timer);
  }, [startTutorial]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="stat-today-tasks">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Tasks</p>
                  <p className="text-2xl font-bold">{totalToday}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-completed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-secondary">{completedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-streak">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold text-accent">{stats?.streak || 0} days</p>
                </div>
                <Flame className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Task Countdown */}
        {nextTask && (
          <Card className="bg-gradient-to-r from-primary to-secondary text-white mb-8" data-testid="next-task-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Next Enforced Task</h3>
                  <p className="text-primary-foreground/80">{nextTask.title}</p>
                  <p className="text-sm text-primary-foreground/60">
                    {format(new Date(nextTask.startAt), "EEEE 'at' h:mm a")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {(() => {
                      const now = new Date();
                      const startTime = new Date(nextTask.startAt);
                      const diffMs = startTime.getTime() - now.getTime();
                      
                      if (diffMs <= 0) return "Starting soon";
                      
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      
                      if (hours > 0) {
                        return `${hours}h ${minutes}m`;
                      } else {
                        return `${minutes}m`;
                      }
                    })()}
                  </p>
                  <p className="text-sm text-primary-foreground/80">remaining</p>
                </div>
              </div>
              
              <Button 
                className="mt-4 bg-white text-primary hover:bg-gray-100" 
                data-testid="button-start-now"
                onClick={() => {
                  // Open PDF window synchronously to prevent popup blocking
                  const pdfWindow = nextTask.pdfFileUrl ? window.open('about:blank', '_blank') : null;
                  startTaskMutation.mutate({ taskId: nextTask.id, pdfWindow });
                }}
                disabled={startTaskMutation.isPending}
              >
                {startTaskMutation.isPending ? "Starting..." : "Start Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Tasks */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Today's Tasks</h2>
            <Button variant="link" className="text-primary" data-testid="link-view-all">
              View all
            </Button>
          </div>
          
          {todayTasks.length === 0 ? (
            <Card data-testid="empty-tasks">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks scheduled for today</p>
                <p className="text-sm">Create your first task to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todayTasks.map((task, index) => (
                <Card 
                  key={task.id} 
                  className="task-card cursor-pointer hover:shadow-md transition-shadow"
                  data-testid={`task-card-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          task.status === 'COMPLETED' ? 'bg-secondary' : 
                          task.status === 'ACTIVE' ? 'bg-primary' : 
                          'bg-muted-foreground'
                        }`} />
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {task.durationMinutes} min
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-muted-foreground flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {format(new Date(task.startAt), "h:mm a")} - {format(new Date(task.endAt), "h:mm a")}
                        </span>
                        <Badge className={`text-xs ${getStrictLevelColor(task.strictLevel)}`}>
                          {task.strictLevel}
                        </Badge>
                      </div>
                      <span className={`font-medium ${getTaskStatusColor(task.status)}`}>
                        {task.status === 'PENDING' ? 'Ready' : 
                         task.status === 'ACTIVE' ? 'In Progress' :
                         task.status === 'COMPLETED' ? 'Completed' : 
                         'Failed'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation currentTab="home" />
      
      <TutorialSystem
        steps={firstTimeTutorialSteps}
        isOpen={showTutorial}
        onClose={closeTutorial}
        onComplete={completeTutorial}
      />
    </div>
  );
}
