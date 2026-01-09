'use client';

import { useState } from 'react';
import { WeekPicker } from './week-picker';
import { CorveeResult } from './corvee-result';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Calendar, Sparkles } from 'lucide-react';

interface GenerationResult {
  schema: string;
  weekStart: string;
  generatedAt: string;
}

export function CorveeForm() {
  const [weekStart, setWeekStart] = useState<string>('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSchema = async () => {
    if (!weekStart) {
      toast.error('Selecteer eerst een week');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/agents/corvee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden');
      }

      setResult({
        schema: data.schema,
        weekStart: data.weekStart,
        generatedAt: data.generatedAt,
      });

      toast.success('Schema succesvol gegenereerd!');
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
            <Calendar className="h-5 w-5 text-primary" />
            Corvee Schema Generator
          </CardTitle>
          <CardDescription>
            Genereer het wekelijkse corveeschema op basis van medewerkersbeschikbaarheid,
            verlof en agenda-afspraken.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <WeekPicker value={weekStart} onChange={setWeekStart} />
            </div>
            <Button
              onClick={generateSchema}
              disabled={loading || !weekStart}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Genereer Schema
                </>
              )}
            </Button>
          </div>

          {loading && (
            <div className="mt-6 p-8 border rounded-lg bg-muted/50">
              <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="text-center">
                  <p className="font-medium">Schema wordt gegenereerd...</p>
                  <p className="text-sm">
                    Dit kan enkele seconden duren. We analyseren beschikbaarheid,
                    verlof en agenda-afspraken.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && !loading && (
        <CorveeResult schema={result.schema} weekStart={result.weekStart} />
      )}
    </div>
  );
}
