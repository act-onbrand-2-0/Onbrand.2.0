'use client';

import { useState } from 'react';
import { PdfUpload } from './pdf-upload';
import { BudgetResult } from './budget-result';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Calculator, Sparkles } from 'lucide-react';

interface GenerationResult {
  budget: string;
  fileName: string;
  generatedAt: string;
}

export function BudgetForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const generateBudget = async () => {
    if (!file) {
      toast.error('Upload eerst een PDF briefing');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/agents/budget', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden');
      }

      // Handle response - n8n returns { success: true, text: "markdown content" }
      const budgetContent = data.text || data.budget || JSON.stringify(data, null, 2);

      setResult({
        budget: budgetContent,
        fileName: data.fileName || file.name,
        generatedAt: data.generatedAt || new Date().toISOString(),
      });

      toast.success('Budget succesvol gegenereerd!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Er is een fout opgetreden'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Account Agent
          </CardTitle>
          <CardDescription>
            Upload een PDF briefing om een projectbudget te genereren op basis van
            medewerkersbeschikbaarheid en uurtarieven.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PdfUpload file={file} onFileChange={setFile} disabled={loading} />

          <Button
            onClick={generateBudget}
            disabled={loading || !file}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Budget wordt gegenereerd...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Genereer Budget
              </>
            )}
          </Button>

          {loading && (
            <div className="p-8 border rounded-lg bg-muted/50">
              <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="text-center">
                  <p className="font-medium">Budget wordt gegenereerd...</p>
                  <p className="text-sm">
                    De PDF wordt geanalyseerd en het budget wordt berekend op basis
                    van beschikbaarheid en uurtarieven.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && !loading && (
        <BudgetResult budget={result.budget} fileName={result.fileName} />
      )}
    </div>
  );
}
