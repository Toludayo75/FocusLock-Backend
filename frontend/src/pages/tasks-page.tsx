import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { AddTaskModal } from "@/components/modals/add-task-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { Task } from "@/types/task";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobileEnforcement } from "@/hooks/use-mobile-enforcement";
import { Plus, Edit, Trash2, Clock, Smartphone, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

export default function TasksPage() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const mobileEnforcement = useMobileEnforcement();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully",
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

  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskData, pdfWindow }: { taskId: string, taskData: Task, pdfWindow?: Window | null }) => {
      // Update status to ACTIVE
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: "ACTIVE" });
      return { task: taskData, pdfWindow };
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

  const filterTasks = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case "today":
        return tasks.filter(task => {
          const taskDate = new Date(task.startAt);
          return taskDate >= today && taskDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });
      case "upcoming":
        return tasks.filter(task => new Date(task.startAt) > new Date(today.getTime() + 24 * 60 * 60 * 1000));
      case "completed":
        return tasks.filter(task => task.status === 'COMPLETED');
      default:
        return tasks;
    }
  };

  const filteredTasks = filterTasks(activeTab);

  const getStrictLevelColor = (level: string) => {
    switch (level) {
      case 'SOFT': return 'bg-secondary text-secondary-foreground';
      case 'MEDIUM': return 'bg-accent text-accent-foreground';
      case 'HARD': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  const handleStartTask = (task: Task) => {
    // Open PDF window synchronously to prevent popup blocking
    const pdfWindow = task.pdfFileUrl ? window.open('about:blank', '_blank') : null;
    startTaskMutation.mutate({ taskId: task.id, taskData: task, pdfWindow });
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <Button onClick={() => setShowAddTask(true)} data-testid="button-add-task">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredTasks.length === 0 ? (
              <Card data-testid="empty-tasks">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab} tasks</p>
                  <p className="text-sm">
                    {activeTab === "today" ? "No tasks scheduled for today" :
                     activeTab === "upcoming" ? "No upcoming tasks scheduled" :
                     "No completed tasks yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task, index) => (
                <Card key={task.id} data-testid={`task-card-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {format(new Date(task.startAt), "EEE h:mm a")} - {format(new Date(task.endAt), "h:mm a")}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {task.durationMinutes} minutes
                          </span>
                          <Badge className={`text-xs ${getStrictLevelColor(task.strictLevel)}`}>
                            {task.strictLevel}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-edit-${index}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{task.targetApps.join(", ")}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{task.proofMethods.join(", ")}</span>
                        </div>
                      </div>
                      
                      {task.status === 'PENDING' && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => handleStartTask(task)}
                          disabled={startTaskMutation.isPending}
                          data-testid={`button-start-${index}`}
                        >
                          {startTaskMutation.isPending ? "Starting..." : "Start Task"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation currentTab="tasks" />
      
      <AddTaskModal 
        isOpen={showAddTask} 
        onClose={() => setShowAddTask(false)} 
      />
      
      <ConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task permanently?"
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
