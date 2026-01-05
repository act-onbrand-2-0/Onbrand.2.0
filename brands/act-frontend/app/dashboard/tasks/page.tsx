'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreHorizontal } from 'lucide-react';

const tasks = [
  { id: 1, title: 'Review project proposal', priority: 'High', dueDate: 'Today', completed: false },
  { id: 2, title: 'Update design mockups', priority: 'Medium', dueDate: 'Tomorrow', completed: false },
  { id: 3, title: 'Send client report', priority: 'High', dueDate: 'Today', completed: true },
  { id: 4, title: 'Team meeting notes', priority: 'Low', dueDate: 'Jan 7', completed: false },
  { id: 5, title: 'Code review for PR #42', priority: 'Medium', dueDate: 'Jan 8', completed: false },
  { id: 6, title: 'Update documentation', priority: 'Low', dueDate: 'Jan 10', completed: true },
];

const priorityColors: Record<string, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function TasksPage() {
  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-6 bg-background w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks and to-dos.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Tasks</span>
              <span className="font-semibold">{tasks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="font-semibold">{tasks.filter(t => t.completed).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-semibold">{tasks.filter(t => !t.completed).length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task List</CardTitle>
            <CardDescription>Your current tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <Checkbox checked={task.completed} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Due: {task.dueDate}</p>
                  </div>
                  <Badge className={priorityColors[task.priority]} variant="secondary">
                    {task.priority}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
