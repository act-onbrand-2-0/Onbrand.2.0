'use client';

interface GreetingProps {
  onSuggestedAction?: (text: string) => void;
}

const SUGGESTED_ACTIONS = [
  { title: 'What are the advantages of using Next.js?', label: 'Next.js advantages' },
  { title: 'Write code to demonstrate Dijkstra\'s algorithm', label: 'Dijkstra algorithm' },
  { title: 'Help me write an essay about Silicon Valley', label: 'Essay writing' },
  { title: 'What is the weather in San Francisco?', label: 'Weather query' },
];

export function Greeting({ onSuggestedAction }: GreetingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 md:py-16 px-4">
      {/* Welcome Text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Hello there!
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          How can I help you today?
        </p>
      </div>

      {/* Suggested Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onSuggestedAction?.(action.title)}
            className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground text-center transition-all hover:bg-muted hover:border-muted-foreground/50"
          >
            {action.title}
          </button>
        ))}
      </div>
    </div>
  );
}
