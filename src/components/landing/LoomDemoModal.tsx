import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHiddenPrimitive from "@radix-ui/react-dialog";
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
);

interface LoomDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOOM_EMBED_URL = "https://www.loom.com/embed/e4d176c9a43541ec8bd9ec1744ec6d61";

export function LoomDemoModal({ open, onOpenChange }: LoomDemoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 bg-card border-border overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Platform Demo</DialogTitle>
        </VisuallyHidden>
        <div className="aspect-video w-full">
          {open && (
            <iframe
              src={`${LOOM_EMBED_URL}?autoplay=1`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
