'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const events = [
  { id: 1, title: 'Team Standup', time: '9:00 AM', duration: '30min', color: 'bg-blue-500' },
  { id: 2, title: 'Client Meeting', time: '11:00 AM', duration: '1h', color: 'bg-purple-500' },
  { id: 3, title: 'Design Review', time: '2:00 PM', duration: '45min', color: 'bg-green-500' },
  { id: 4, title: 'Project Planning', time: '4:00 PM', duration: '1h', color: 'bg-orange-500' },
];

export default function CalendarPage() {
  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-6 bg-background w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and appointments.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>January 2026</CardTitle>
              <CardDescription>Your monthly overview</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 3;
                const isToday = day === 5;
                const hasEvent = [5, 12, 15, 22, 28].includes(day);
                return (
                  <div
                    key={i}
                    className={`p-2 h-12 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors ${
                      day < 1 || day > 31 ? 'text-muted-foreground/30' : ''
                    } ${isToday ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {day > 0 && day <= 31 ? day : ''}
                    {hasEvent && !isToday && <div className="w-1 h-1 bg-primary rounded-full mx-auto mt-1" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Events</CardTitle>
            <CardDescription>January 5, 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className={`w-1 h-12 rounded-full ${event.color}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.time} · {event.duration}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
