'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus } from 'lucide-react';

const conversations = [
  { id: 1, name: 'Alex Ray', message: 'Hey, can we discuss the project?', time: '2m ago', unread: true },
  { id: 2, name: 'Mina Swan', message: 'The design files are ready', time: '15m ago', unread: true },
  { id: 3, name: 'John Kim', message: 'Thanks for the update!', time: '1h ago', unread: false },
  { id: 4, name: 'Sarah Lee', message: 'Meeting rescheduled to 3pm', time: '2h ago', unread: false },
  { id: 5, name: 'David Chen', message: 'Can you review this?', time: '3h ago', unread: false },
];

export default function MessagesPage() {
  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-6 bg-background w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-muted-foreground">Manage your conversations and communications.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversations</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/9.x/glass/svg?seed=${conv.name}`} />
                    <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{conv.name}</p>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.message}</p>
                  </div>
                  {conv.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Select a conversation</CardTitle>
            <CardDescription>Choose a conversation from the list to view messages.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
            No conversation selected
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
