import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Camera, ClipboardCheck, MessageSquare, Upload, X } from "lucide-react";

interface ProofSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export function ProofSubmissionModal({ isOpen, onClose, taskId, taskTitle }: ProofSubmissionModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("screenshot");
  const [checkinText, setCheckinText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  const submitProofMutation = useMutation({
    mutationFn: async (proofData: any) => {
      const response = await apiRequest("POST", `/api/proof/${taskId}/${activeTab}`, proofData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Proof submitted successfully!",
        description: "Device unlocked. Great job completing your task!",
      });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Proof submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCheckinText("");
    setSelectedFile(null);
    setQuizAnswers({});
    setActiveTab("screenshot");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    let proofData: any = {};

    switch (activeTab) {
      case "screenshot":
        if (!selectedFile) {
          toast({
            title: "Screenshot required",
            description: "Please upload a screenshot to submit proof",
            variant: "destructive",
          });
          return;
        }
        const formData = new FormData();
        formData.append("screenshot", selectedFile);
        proofData = formData;
        break;
      
      case "quiz":
        if (Object.keys(quizAnswers).length === 0) {
          toast({
            title: "Quiz answers required",
            description: "Please answer all quiz questions",
            variant: "destructive",
          });
          return;
        }
        proofData = { answers: quizAnswers };
        break;
      
      case "checkin":
        if (!checkinText.trim()) {
          toast({
            title: "Check-in text required",
            description: "Please provide your key learnings",
            variant: "destructive",
          });
          return;
        }
        proofData = { text: checkinText };
        break;
    }

    submitProofMutation.mutate(proofData);
  };

  // Mock quiz questions - in real app, these would come from API
  const quizQuestions = [
    {
      id: "q1",
      question: "What was the main topic covered in today's lesson?",
      options: [
        { value: "a", label: "React Hooks" },
        { value: "b", label: "State Management" },
        { value: "c", label: "Component Lifecycle" },
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="proof-submission-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="modal-title">Submit Proof</DialogTitle>
            <div className="text-sm text-muted-foreground">Task: {taskTitle}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="absolute right-4 top-4" data-testid="button-close">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="screenshot" data-testid="tab-screenshot">
                <Camera className="w-4 h-4 mr-2" />
                Screenshot
              </TabsTrigger>
              <TabsTrigger value="quiz" data-testid="tab-quiz">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Quiz
              </TabsTrigger>
              <TabsTrigger value="checkin" data-testid="tab-checkin">
                <MessageSquare className="w-4 h-4 mr-2" />
                Check-in
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenshot" className="space-y-4">
              <Card className="border-2 border-dashed border-border">
                <CardContent className="p-8 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a screenshot showing task completion
                  </p>
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <Button variant="outline" onClick={() => setSelectedFile(null)}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="screenshot-input"
                        data-testid="input-screenshot"
                      />
                      <Button asChild>
                        <label htmlFor="screenshot-input" className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </label>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-4">
              {quizQuestions.map((question) => (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <p className="font-medium mb-3">{question.question}</p>
                    <RadioGroup
                      value={quizAnswers[question.id] || ""}
                      onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [question.id]: value })}
                    >
                      {question.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                          <Label htmlFor={`${question.id}-${option.value}`} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="checkin" className="space-y-4">
              <div>
                <Label htmlFor="checkin-text" className="text-sm font-medium">
                  What did you learn? (2-3 key takeaways)
                </Label>
                <Textarea
                  id="checkin-text"
                  placeholder="Describe your key learnings from this session..."
                  value={checkinText}
                  onChange={(e) => setCheckinText(e.target.value)}
                  className="mt-2 h-32 resize-none"
                  data-testid="textarea-checkin"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={submitProofMutation.isPending}
              data-testid="button-submit"
            >
              {submitProofMutation.isPending ? "Submitting..." : "Submit Proof"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
