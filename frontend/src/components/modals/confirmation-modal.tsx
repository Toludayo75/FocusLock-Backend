import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, LogOut, Info } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmationModalProps) {
  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <Trash2 className="w-12 h-12 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-accent" />;
      default:
        return <Info className="w-12 h-12 text-primary" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case "destructive":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="confirmation-modal">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            {getIcon()}
          </div>
          <DialogTitle data-testid="modal-title">{title}</DialogTitle>
          <DialogDescription data-testid="modal-message">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            data-testid="button-cancel"
          >
            {cancelText}
          </Button>
          <Button 
            variant={getButtonVariant()}
            onClick={onConfirm} 
            className="flex-1"
            data-testid="button-confirm"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
