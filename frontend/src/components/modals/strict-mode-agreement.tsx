import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface StrictModeAgreementProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function StrictModeAgreement({ isOpen, onAccept, onReject }: StrictModeAgreementProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onReject}>
      <DialogContent className="sm:max-w-md" data-testid="strict-mode-modal">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Shield className="h-8 w-8 text-accent-foreground" />
          </div>
          <DialogTitle data-testid="modal-title">Strict Mode Agreement</DialogTitle>
          <DialogDescription>
            Please review and accept the terms to enable strict enforcement features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm font-medium">By enabling Strict Mode, you agree that:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Your device will be locked to specific apps during tasks
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              You must submit proof to unlock your device
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Uninstall protection may be enabled with cooldown periods
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              You understand this is for your productivity benefit
            </li>
          </ul>
        </div>
        
        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onReject} 
            className="flex-1"
            data-testid="button-reject"
          >
            Reject
          </Button>
          <Button 
            onClick={onAccept} 
            className="flex-1"
            data-testid="button-accept"
          >
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
