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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertTask } from "@/types/schema";
import { X, Bell, Clock, Shield, Upload, Smartphone } from "lucide-react";
// UNCOMMENT FOR MOBILE VERSION:
// import { useMobileEnforcement } from "@/hooks/use-mobile-enforcement";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startAt: z.string().min(1, "Start time is required"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute").max(480, "Duration cannot exceed 8 hours"),
  strictLevel: z.enum(['SOFT', 'MEDIUM', 'HARD']),
  targetApps: z.array(z.string()).min(1, "At least one target app is required"),
  proofMethods: z.array(z.string()).min(1, "At least one proof method is required"),
  pdfFile: z.instanceof(File).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
  const { toast } = useToast();
  const [proofMethods, setProofMethods] = useState<string[]>(['screenshot']);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [targetApps, setTargetApps] = useState<string[]>([]);
  
  // UNCOMMENT FOR MOBILE VERSION:
  // const mobileEnforcement = useMobileEnforcement();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      startAt: "",
      durationMinutes: 60,
      strictLevel: 'MEDIUM',
      targetApps: [],
      proofMethods: ['screenshot'],
      pdfFile: undefined,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.data;
    },
    onSuccess: async (/* createdTask */) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // UNCOMMENT FOR MOBILE VERSION - START ENFORCEMENT IF TASK STARTS SOON:
      // const taskStartTime = new Date(createdTask.startAt);
      // const now = new Date();
      // const minutesUntilStart = (taskStartTime.getTime() - now.getTime()) / (1000 * 60);
      // 
      // if (minutesUntilStart <= 5) { // Start enforcement if task starts within 5 minutes
      //   const enforcementStarted = await mobileEnforcement.startEnforcement({
      //     strictLevel: createdTask.strictLevel,
      //     targetApps: createdTask.targetApps,
      //     durationMinutes: createdTask.durationMinutes
      //   });
      //   
      //   if (enforcementStarted) {
      //     toast({
      //       title: "Task created & enforcement started",
      //       description: "Device enforcement is now active for this task",
      //     });
      //   } else {
      //     toast({
      //       title: "Task created",
      //       description: "Please enable Device Administrator for enforcement",
      //       variant: "destructive"
      //     });
      //   }
      // } else {
        toast({
          title: "Task created",
          description: "Your task has been created successfully",
        });
      // }
      
      onClose();
      form.reset();
      setProofMethods(['screenshot']);
      setSelectedPdf(null);
      setTargetApps([]);
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

    const taskData: InsertTask = {
      title: data.title,
      startAt: startDateTime.toISOString(),
      durationMinutes: data.durationMinutes,
      strictLevel: data.strictLevel,
      targetApps: targetApps,
      proofMethods: proofMethods,
      pdfFile: selectedPdf || undefined,
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

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdf(file);
      form.setValue('pdfFile', file);
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveApp = (appToRemove: string) => {
    const updatedApps = targetApps.filter(app => app !== appToRemove);
    setTargetApps(updatedApps);
    form.setValue('targetApps', updatedApps);
  };

  
  const handleAppSelection = () => {
    // TODO: WEB PWA IMPLEMENTATION (FOR BROWSER-BASED MOBILE APPS)
    // UNCOMMENT THIS IF CONVERTING TO PWA WITH MANIFEST FILE
    // REQUIRES: WEB APP MANIFEST + HTTPS + SUPPORTED BROWSER
    // if (window.navigator && 'getInstalledRelatedApps' in window.navigator) {
    //   navigator.getInstalledRelatedApps().then(apps => {
    //     const installedApps = apps.map(app => ({
    //       name: app.name || app.id,
    //       id: app.id || app.url,
    //       icon: app.icons?.[0]?.src || ''
    //     }));
    //     setAvailableApps(installedApps);
    //   }).catch(err => {
    //     console.log('Could not get installed apps:', err);
    //     setAvailableApps(getCommonApps());
    //   });
    // }

    // TODO: CAPACITOR ANDROID IMPLEMENTATION (FOR NATIVE ANDROID APP)
    // UNCOMMENT THIS WHEN CONVERTING TO CAPACITOR + ANDROID STUDIO
    // REQUIRES: npm install @capacitor-community/app-launcher
    // REQUIRES: ADD ANDROID PERMISSION IN AndroidManifest.xml
    // try {
    //   const apps = await AppLauncher.getInstalledApps();
    //   const installedApps = apps.map(app => ({
    //     name: app.name,
    //     packageId: app.packageId,
    //     icon: app.icon
    //   }));
    //   setAvailableApps(installedApps);
    // } catch (error) {
    //   console.log('Could not get installed apps:', error);
    //   setAvailableApps(getCommonApps());
    // }

    // CURRENT WEB APP BEHAVIOR - REMOVE WHEN MOBILE IS IMPLEMENTED
    const mockApps = [
      'Chrome', 'Firefox', 'Safari', 'Edge',
      'VS Code', 'Notion', 'Discord', 'Slack'
    ];

    toast({
      title: "App Selection",
      description: "Mobile app selection feature coming soon. For now, manually add app names.",
    });

    console.log('Available apps:', mockApps);
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
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors ${
                    form.watch("strictLevel") === "SOFT" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
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
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors ${
                    form.watch("strictLevel") === "MEDIUM" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
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
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors ${
                    form.watch("strictLevel") === "HARD" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
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

          {/* PDF Upload */}
          <div>
            <Label htmlFor="pdfFile">PDF Document (Optional)</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="hidden"
                id="pdf-input"
                data-testid="input-pdf"
              />
              <Button type="button" variant="outline" asChild>
                <label htmlFor="pdf-input" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose PDF
                </label>
              </Button>
              {selectedPdf && (
                <span className="text-sm text-muted-foreground">{selectedPdf.name}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upload a PDF to read during the task</p>
          </div>

          {/* Target Apps Selection */}
          <div>
            <Label className="text-base font-medium">Target Apps</Label>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAppSelection}
                className="w-full justify-start"
                data-testid="button-select-apps"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {targetApps.length > 0 ? `${targetApps.length} apps selected` : 'Select target apps'}
              </Button>
              {targetApps.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {targetApps.map((app, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                    >
                      {app}
                      <button
                        type="button"
                        onClick={() => handleRemoveApp(app)}
                        className="ml-1 text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">These apps will be available during task enforcement</p>
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
