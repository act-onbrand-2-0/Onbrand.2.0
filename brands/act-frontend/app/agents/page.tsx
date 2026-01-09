'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Calculator, ArrowRight, Bot } from 'lucide-react';

const agents = [
  {
    id: 'corvee',
    title: 'Corvee Schema Generator',
    description:
      'Genereer het wekelijkse corveeschema op basis van medewerkersbeschikbaarheid, verlof en agenda-afspraken.',
    icon: Calendar,
    href: '/agents/corvee',
    status: 'active' as const,
    features: [
      'Automatische beschikbaarheidscontrole',
      'Verlof en agenda-integratie',
      'AI-gegenereerde planning',
    ],
  },
  {
    id: 'budget',
    title: 'Account Agent',
    description:
      'Genereer projectbudgetten op basis van PDF briefings met automatische kostenberekening.',
    icon: Calculator,
    href: '/agents/budget',
    status: 'active' as const,
    features: [
      'PDF briefing analyse',
      'Uurtarief berekeningen',
      'Team beschikbaarheid',
    ],
  },
];

export default function AgentsOverviewPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="size-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI Agents</h1>
        </div>
        <p className="text-muted-foreground">
          Automatiseer taken met AI-gestuurde agents. Selecteer een agent om te
          beginnen.
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={
              agent.status === 'coming-soon' ? 'opacity-60' : 'hover:border-primary/50 transition-colors'
            }
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <agent.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.title}</CardTitle>
                    {agent.status === 'coming-soon' && (
                      <Badge variant="secondary" className="mt-1">
                        Binnenkort beschikbaar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {agent.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {agent.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="size-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              {agent.status === 'active' ? (
                <Link href={agent.href}>
                  <Button className="w-full">
                    Open Agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button className="w-full" disabled>
                  Binnenkort beschikbaar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
