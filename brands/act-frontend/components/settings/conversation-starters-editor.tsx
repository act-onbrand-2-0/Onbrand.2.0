'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RotateCcw, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Starter {
  title: string;
  label: string;
}

interface ConversationStartersEditorProps {
  brandId: string;
  userId: string;
  jobFunction: string | null;
}

export function ConversationStartersEditor({ brandId, userId, jobFunction }: ConversationStartersEditorProps) {
  const [starters, setStarters] = useState<Record<string, Starter[]>>({});
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // The role to edit - use selected job function or default to 'Other'
  const currentRole = jobFunction || 'Other';

  const fetchStarters = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/brand-settings/conversation-starters?brandId=${brandId}`);
      const data = await res.json();
      
      if (res.ok) {
        setStarters(data.conversation_starters);
        setIsCustom(data.is_custom);
      } else {
        setError(data.error || 'Failed to load conversation starters');
      }
    } catch (err) {
      console.error('Error fetching starters:', err);
      setError('Failed to load conversation starters');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchStarters();
  }, [fetchStarters]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const res = await fetch('/api/brand-settings/conversation-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          userId,
          conversation_starters: starters,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess('Conversation starters saved successfully!');
        setIsCustom(true);
        setHasChanges(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save conversation starters');
      }
    } catch (err) {
      console.error('Error saving starters:', err);
      setError('Failed to save conversation starters');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all conversation starters to defaults? This will remove all custom starters.')) {
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const res = await fetch(
        `/api/brand-settings/conversation-starters?brandId=${brandId}&userId=${userId}`,
        { method: 'DELETE' }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        setStarters(data.conversation_starters);
        setIsCustom(false);
        setHasChanges(false);
        setSuccess('Conversation starters reset to defaults!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to reset conversation starters');
      }
    } catch (err) {
      console.error('Error resetting starters:', err);
      setError('Failed to reset conversation starters');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStarter = (index: number, field: 'title' | 'label', value: string) => {
    setStarters(prev => {
      const roleStarters = [...(prev[currentRole] || [])];
      roleStarters[index] = { ...roleStarters[index], [field]: value };
      return { ...prev, [currentRole]: roleStarters };
    });
    setHasChanges(true);
  };

  const addStarter = () => {
    setStarters(prev => {
      const roleStarters = [...(prev[currentRole] || [])];
      roleStarters.push({ title: '', label: '' });
      return { ...prev, [currentRole]: roleStarters };
    });
    setHasChanges(true);
  };

  const removeStarter = (index: number) => {
    setStarters(prev => {
      const roleStarters = [...(prev[currentRole] || [])];
      roleStarters.splice(index, 1);
      return { ...prev, [currentRole]: roleStarters };
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Conversation Starters</h2>
        <p className="text-sm text-muted-foreground">
          Customize the suggested prompts shown to users based on their role. These appear when starting a new chat.
        </p>
        {isCustom && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            Custom starters active
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-medium">Editing starters for:</span>
          <span className="px-2 py-1 text-sm bg-primary/10 text-primary rounded-md font-medium">
            {currentRole}
          </span>
        </div>
        
        <div className="space-y-3">
          {(starters[currentRole] || []).map((starter, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Label (button text)
                    </label>
                    <input
                      type="text"
                      value={starter.label}
                      onChange={(e) => updateStarter(index, 'label', e.target.value)}
                      placeholder="e.g., Content Strategy"
                      className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Prompt (full text sent to AI)
                    </label>
                    <textarea
                      value={starter.title}
                      onChange={(e) => updateStarter(index, 'title', e.target.value)}
                      placeholder="e.g., Help me develop a content strategy for launching [product/campaign] across multiple channels"
                      rows={3}
                      className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStarter(index)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove starter"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          
          {(starters[currentRole] || []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
              No conversation starters yet. Add one below.
            </div>
          )}
          
          <button
            type="button"
            onClick={() => addStarter()}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="size-4" />
            Add starter
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            hasChanges
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </button>
        
        {isCustom && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
          >
            <RotateCcw className="size-4" />
            Reset to Defaults
          </button>
        )}
        
        {hasChanges && (
          <span className="text-xs text-muted-foreground">
            You have unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
