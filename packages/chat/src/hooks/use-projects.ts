'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types';

interface UseProjectsProps {
  supabase: SupabaseClient;
  brandId: string;
  userId: string;
}

interface UseProjectsReturn {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, updates: UpdateProjectInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (projectId: string | null) => void;
  getDefaultProject: () => Project | null;
}

// Default colors for new projects
export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

// Available icons for projects
export const PROJECT_ICONS = [
  'folder',
  'briefcase',
  'code',
  'file-text',
  'image',
  'video',
  'music',
  'globe',
  'star',
  'heart',
  'zap',
  'target',
  'compass',
  'flag',
  'bookmark',
];

export function useProjects({
  supabase,
  brandId,
  userId,
}: UseProjectsProps): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects for the brand/user
  const fetchProjects = useCallback(async () => {
    if (!brandId || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('archived', false)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setProjects(data || []);

      // Auto-select default project if none selected
      if (!currentProject && data && data.length > 0) {
        const defaultProject = data.find((p) => p.is_default) || data[0];
        setCurrentProject(defaultProject);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, brandId, userId, currentProject]);

  // Create a new project
  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<Project> => {
      setError(null);

      const newProject = {
        brand_id: brandId,
        user_id: userId,
        name: input.name,
        description: input.description || null,
        color: input.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
        icon: input.icon || 'folder',
        is_default: false,
      };

      const { data, error: createError } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      setProjects((prev) => [...prev, data]);
      return data;
    },
    [supabase, brandId, userId]
  );

  // Update a project
  const updateProject = useCallback(
    async (id: string, updates: UpdateProjectInput): Promise<void> => {
      setError(null);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('brand_id', brandId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProjects((prev) =>
        prev.map((proj) => (proj.id === id ? { ...proj, ...updates } : proj))
      );

      // Update currentProject if it was the one being updated
      if (currentProject?.id === id) {
        setCurrentProject((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [supabase, brandId, currentProject]
  );

  // Delete a project
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      // Prevent deleting default project
      const project = projects.find((p) => p.id === id);
      if (project?.is_default) {
        throw new Error('Cannot delete the default project');
      }

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('brand_id', brandId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setProjects((prev) => prev.filter((proj) => proj.id !== id));

      // If deleted project was selected, switch to default
      if (currentProject?.id === id) {
        const defaultProject = projects.find((p) => p.is_default);
        setCurrentProject(defaultProject || null);
      }
    },
    [supabase, brandId, currentProject, projects]
  );

  // Select a project
  const selectProject = useCallback(
    (projectId: string | null) => {
      if (projectId === null) {
        setCurrentProject(null);
      } else {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          setCurrentProject(project);
        }
      }
    },
    [projects]
  );

  // Get the default project
  const getDefaultProject = useCallback((): Project | null => {
    return projects.find((p) => p.is_default) || null;
  }, [projects]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!brandId || !userId) return;

    const channel = supabase
      .channel(`projects:${brandId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProj = payload.new as Project;
            if (newProj.user_id === userId) {
              setProjects((prev) => [...prev, newProj]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Project;
            setProjects((prev) =>
              prev.map((proj) => (proj.id === updated.id ? updated : proj))
            );
            if (currentProject?.id === updated.id) {
              setCurrentProject(updated);
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setProjects((prev) => prev.filter((proj) => proj.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, brandId, userId, currentProject]);

  return {
    projects,
    currentProject,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    getDefaultProject,
  };
}
