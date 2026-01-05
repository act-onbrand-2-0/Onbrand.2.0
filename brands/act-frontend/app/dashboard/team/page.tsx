'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MoreHorizontal, Mail } from 'lucide-react';

const teamMembers = [
  { id: 1, name: 'Alex Ray', role: 'Product Manager', email: 'alex@company.com', status: 'Active' },
  { id: 2, name: 'Mina Swan', role: 'Lead Designer', email: 'mina@company.com', status: 'Active' },
  { id: 3, name: 'John Kim', role: 'Senior Developer', email: 'john@company.com', status: 'Active' },
  { id: 4, name: 'Sarah Lee', role: 'Marketing Lead', email: 'sarah@company.com', status: 'Away' },
  { id: 5, name: 'David Chen', role: 'Data Analyst', email: 'david@company.com', status: 'Active' },
  { id: 6, name: 'Emma Wilson', role: 'UX Researcher', email: 'emma@company.com', status: 'Offline' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Away: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Offline: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function TeamPage() {
  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-6 bg-background w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground">Manage your team members and roles.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://api.dicebear.com/9.x/glass/svg?seed=${member.name}`} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </div>
                <Badge className={statusColors[member.status]} variant="secondary">
                  {member.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Overview</CardTitle>
          <CardDescription>Quick stats about your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{teamMembers.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{teamMembers.filter(m => m.status === 'Active').length}</p>
              <p className="text-sm text-muted-foreground">Active Now</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">4</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
