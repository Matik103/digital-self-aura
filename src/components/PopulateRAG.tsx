import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PopulateRAG = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handlePopulate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-rag`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to populate RAG database");
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Success!",
        description: `Populated RAG database with ${data.successCount} documents`,
      });
    } catch (error) {
      console.error("Populate RAG error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to populate RAG database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Populate RAG Database</h2>
            <p className="text-sm text-muted-foreground">
              Load all knowledge about Ernst into the external database
            </p>
          </div>
        </div>

        <Button
          onClick={handlePopulate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Populating Database...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Populate RAG Database
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-card border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium">
                {result.successCount} documents added successfully
              </span>
            </div>
            {result.errorCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="font-medium">
                  {result.errorCount} documents failed
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PopulateRAG;
