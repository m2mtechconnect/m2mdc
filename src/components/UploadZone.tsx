import { useState } from "react";
import { Upload, FileText, Globe, Box, Folder, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import UploadQueue from "@/components/upload/UploadQueue";
import PreviewPane from "@/components/upload/PreviewPane";
import { formatFileSize } from "@/lib/formatters";

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    name: string;
    size: string;
    status: "uploading" | "processing" | "success" | "error";
    progress: number;
    error?: string;
  }>>([]);
  const [previewItems, setPreviewItems] = useState<Array<{
    title: string;
    chunks: number;
    preview: string;
  }>>([]);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const MAX_BATCH_SIZE = 1024 * 1024 * 1024; // 1GB total
    
    // Validate file sizes
    const invalidFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (invalidFiles.length > 0) {
      toast.error(`Files too large: ${invalidFiles.map(f => f.name).join(", ")} (max 20MB per file)`);
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_BATCH_SIZE) {
      toast.error("Total upload size exceeds 1GB limit. Please upload in smaller batches.");
      return;
    }

    const fileNames = files.map(f => f.name);
    setUploadedFiles(prev => [...prev, ...fileNames]);
    
    // Add files to upload queue with error simulation
    const newQueueItems = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      size: formatFileSize(file.size),
      status: "uploading" as const,
      progress: 0,
    }));
    setUploadQueue(prev => [...prev, ...newQueueItems]);
    
    // Store cleanup functions
    const cleanupFunctions: (() => void)[] = [];
    
    // Simulate upload with retry logic
    newQueueItems.forEach((item, idx) => {
      const shouldFail = Math.random() < 0.15; // 15% failure rate for demo
      let retryCount = 0;
      
      const uploadFile = () => {
        const interval = setInterval(() => {
          setUploadQueue(prev => prev.map(q => {
            if (q.id === item.id && q.progress < 100) {
              const newProgress = Math.min(q.progress + Math.random() * 25, 100);
              if (newProgress >= 100) {
                return { ...q, progress: 100, status: "processing" as const };
              }
              return { ...q, progress: newProgress };
            }
            return q;
          }));
        }, 300);

        const timeout = setTimeout(() => {
          clearInterval(interval);
          
          if (shouldFail && retryCount === 0) {
            // Simulate failure on first attempt
            setUploadQueue(prev => prev.map(q => 
              q.id === item.id 
                ? { ...q, status: "error" as const, progress: 0, error: "Network timeout - click retry" } 
                : q
            ));
            retryCount++;
          } else {
            // Success
            setUploadQueue(prev => prev.map(q => 
              q.id === item.id ? { ...q, status: "success" as const, progress: 100 } : q
            ));
            
            // Add to preview
            setPreviewItems(prev => [...prev, {
              title: files[idx].name,
              chunks: Math.floor(Math.random() * 20) + 5,
              preview: "Sample extracted text from document...",
            }]);
          }
        }, 2000 + idx * 500);

        cleanupFunctions.push(() => {
          clearInterval(interval);
          clearTimeout(timeout);
        });
      };

      uploadFile();
    });

    toast.success(`Upload started — processing ${files.length} file${files.length > 1 ? 's' : ''}...`);

    // Auto-suggest next step
    const suggestionTimeout = setTimeout(() => {
      const suggestion = files.some(f => f.name.endsWith('.pdf')) 
        ? "Document Analysis Assistant"
        : files.some(f => f.name.endsWith('.csv'))
        ? "Data Analysis Assistant"
        : "General Assistant";
      
      toast.info(
        <div 
          className="cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            navigate("/builder");
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate("/builder");
            }
          }}
        >
          <p className="font-semibold">💡 Smart Suggestion</p>
          <p className="text-sm">Create a {suggestion} →</p>
        </div>,
        { duration: 5000 }
      );
    }, 3000);

    cleanupFunctions.push(() => clearTimeout(suggestionTimeout));
    
    // Store cleanup functions for potential component unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  };

  const handleRetry = (id: string) => {
    // Find the file and restart upload
    setUploadQueue(prev => prev.map(q => {
      if (q.id === id) {
        // Restart with exponential backoff simulation
        const newItem = { ...q, status: "uploading" as const, progress: 0, error: undefined };
        
        const interval = setInterval(() => {
          setUploadQueue(prev2 => prev2.map(q2 => {
            if (q2.id === id && q2.progress < 100) {
              const newProgress = Math.min(q2.progress + Math.random() * 30, 100);
              if (newProgress >= 100) {
                clearInterval(interval); // Clear immediately when done
                return { ...q2, progress: 100, status: "processing" as const };
              }
              return { ...q2, progress: newProgress };
            }
            return q2;
          }));
        }, 300);

        const timeout = setTimeout(() => {
          clearInterval(interval);
          setUploadQueue(prev2 => prev2.map(q2 => 
            q2.id === id ? { ...q2, status: "success" as const, progress: 100 } : q2
          ));
          toast.success("File uploaded successfully after retry!");
        }, 2000);

        return newItem;
      }
      return q;
    }));
  };

  const handleCancel = (id: string) => {
    setUploadQueue(prev => prev.filter(q => q.id !== id));
    toast.info("Upload cancelled");
  };

  return (
    <Card
      className={`glass-panel p-12 text-center transition-all duration-300 ${
        isDragging ? "border-primary glow-yellow scale-[1.02]" : "border-dashed border-2"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Upload className={`h-16 w-16 transition-smooth ${isDragging ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
            {isDragging && (
              <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
            )}
          </div>
        </div>

        <h3 className="text-2xl font-display font-bold mb-2">
          Drop your files or paste a website link
        </h3>
        <p className="text-muted-foreground mb-8">
          We'll analyze and prepare it for your AI assistant
        </p>

        {/* Upload options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <label className="cursor-pointer group">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-smooth">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-smooth" />
              <p className="text-sm font-medium">Document</p>
            </div>
          </label>

          <button
            onClick={() => {
              const url = prompt("Enter website URL:");
              if (url && url.trim()) {
                toast.success("Analyzing website...");
                const timeout = setTimeout(() => navigate("/builder?source=website"), 1000);
                // Cleanup handled by React when component unmounts
                return () => clearTimeout(timeout);
              }
            }}
            className="p-4 border border-border rounded-lg hover:border-secondary hover:bg-secondary/5 transition-smooth group"
            aria-label="Add website as data source"
          >
            <Globe className="h-8 w-8 mx-auto mb-2 text-secondary group-hover:scale-110 transition-smooth" />
            <p className="text-sm font-medium">Website</p>
          </button>

          <button
            onClick={() => navigate("/manage/integrations")}
            className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-smooth group"
            aria-label="Connect app integration as data source"
          >
            <Box className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-smooth" />
            <p className="text-sm font-medium">App</p>
          </button>

          <label className="cursor-pointer group">
            <input
              type="file"
              {...({ webkitdirectory: "true" } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="p-4 border border-border rounded-lg hover:border-secondary hover:bg-secondary/5 transition-smooth">
              <Folder className="h-8 w-8 mx-auto mb-2 text-secondary group-hover:scale-110 transition-smooth" />
              <p className="text-sm font-medium">Folder</p>
            </div>
          </label>
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="mt-6">
            <UploadQueue 
              items={uploadQueue} 
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Preview Pane */}
        {previewItems.length > 0 && (
          <div className="mt-6">
            <PreviewPane items={previewItems} />
          </div>
        )}
      </div>
    </Card>
  );
}
