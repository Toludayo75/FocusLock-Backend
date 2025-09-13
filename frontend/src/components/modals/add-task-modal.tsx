import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertTask } from "@/types/task";
import { X, Bell, Clock, Shield } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startAt: z.string().min(1, "Start time is required"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute").max(480, "Duration cannot exceed 8 hours"),
  strictLevel: z.enum(['SOFT', 'MEDIUM', 'HARD']),
  targetApps: z.string().min(1, "At least one target app is required"),
  proofMethods: z.array(z.string()).min(1, "At least one proof method is required"),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
  const { toast } = useToast();
  const [proofMethods, setProofMethods] = useState<string[]>(['screenshot']);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      startAt: "",
      durationMinutes: 60,
      strictLevel: 'MEDIUM',
      targetApps: "",
      proofMethods: ['screenshot'],
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully",
      });
      onClose();
      form.reset();
      setProofMethods(['screenshot']);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    const startDateTime = new Date(data.startAt);
    const endDateTime = new Date(startDateTime.getTime() + data.durationMinutes * 60000);

    const taskData: InsertTask = {
      title: data.title,
      startAt: startDateTime.toISOString(),
      durationMinutes: data.durationMinutes,
      strictLevel: data.strictLevel,
      targetApps: data.targetApps.split(',').map(app => app.trim()),
      proofMethods: proofMethods,
    };

    createTaskMutation.mutate(taskData);
  };

  const handleProofMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setProofMethods([...proofMethods, method]);
    } else {
      setProofMethods(proofMethods.filter(m => m !== method));
    }
    form.setValue('proofMethods', checked ? [...proofMethods, method] : proofMethods.filter(m => m !== method));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-task-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="modal-title">Add New Task</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Task Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="e.g., Coursera: Deep Learning Course"
                {...form.register("title")}
                data-testid="input-title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startAt">Start Time</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  {...form.register("startAt")}
                  data-testid="input-start-time"
                />
                {form.formState.errors.startAt && (
                  <p className="text-sm text-destructive">{form.formState.errors.startAt.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  min="1"
                  max="480"
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                  data-testid="input-duration"
                />
                {form.formState.errors.durationMinutes && (
                  <p className="text-sm text-destructive">{form.formState.errors.durationMinutes.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Strict Level */}
          <div>
            <Label className="text-base font-medium">Strict Level</Label>
            <RadioGroup
              value={form.watch("strictLevel")}
              onValueChange={(value) => form.setValue("strictLevel", value as 'SOFT' | 'MEDIUM' | 'HARD')}
              className="grid grid-cols-3 gap-3 mt-3"
            >
              <div>
                <RadioGroupItem value="SOFT" id="soft" className="sr-only peer" />
                <Label
                  htmlFor="soft"
                  className="flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary/50 transition-colors"
                  data-testid="option-soft"
                >
                  <div className="w-8 h-8 bg-secondary rounded-full mb-2 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="font-medium">SOFT</div>
                  <div className="text-xs text-muted-foreground">Nudge only</div>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="MEDIUM" id="medium" className="sr-only peer" />
                <Label
                  htmlFor="medium"
                  className="flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary/50 transition-colors"
                  data-testid="option-medium"
                >
                  <div className="w-8 h-8 bg-accent rounded-full mb-2 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="font-medium">MEDIUM</div>
                  <div className="text-xs text-muted-foreground">10s grace</div>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="HARD" id="hard" className="sr-only peer" />
                <Label
                  htmlFor="hard"
                  className="flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary/50 transition-colors"
                  data-testid="option-hard"
                >
                  <div className="w-8 h-8 bg-destructive rounded-full mb-2 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-destructive-foreground" />
                  </div>
                  <div className="font-medium">HARD</div>
                  <div className="text-xs text-muted-foreground">Immediate block</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Apps */}
          <div>
            <Label htmlFor="targetApps">Target Apps</Label>
            <Input
              id="targetApps"
              placeholder="e.g., Coursera, VS Code, Chrome"
              {...form.register("targetApps")}
              data-testid="input-target-apps"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate multiple apps with commas</p>
            {form.formState.errors.targetApps && (
              <p className="text-sm text-destructive">{form.formState.errors.targetApps.message}</p>
            )}
          </div>

          {/* Proof Methods */}
          <div>
            <Label className="text-base font-medium">Proof Methods</Label>
            <div className="space-y-2 mt-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="screenshot"
                  checked={proofMethods.includes('screenshot')}
                  onCheckedChange={(checked) => handleProofMethodChange('screenshot', checked as boolean)}
                  data-testid="checkbox-screenshot"
                />
                <Label htmlFor="screenshot" className="text-sm">Screenshot proof</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="quiz"
                  checked={proofMethods.includes('quiz')}
                  onCheckedChange={(checked) => handleProofMethodChange('quiz', checked as boolean)}
                  data-testid="checkbox-quiz"
                />
                <Label htmlFor="quiz" className="text-sm">Quiz proof</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="checkin"
                  checked={proofMethods.includes('checkin')}
                  onCheckedChange={(checked) => handleProofMethodChange('checkin', checked as boolean)}
                  data-testid="checkbox-checkin"
                />
                <Label htmlFor="checkin" className="text-sm">Check-in proof</Label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createTaskMutation.isPending}
              data-testid="button-create"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
