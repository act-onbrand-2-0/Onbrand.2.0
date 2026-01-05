'use client';

// Role-based suggestions
const ROLE_SUGGESTIONS: Record<string, Array<{ title: string; label: string }>> = {
  'Strategist': [
    { title: 'Analyze my target audience demographics and suggest content pillars that would resonate with them', label: 'Audience Analysis' },
    { title: 'Help me develop a content strategy for launching [product/campaign] across multiple channels', label: 'Content Strategy' },
    { title: "Review my competitor's messaging and identify gaps we could exploit in our positioning", label: 'Competitor Analysis' },
    { title: 'Create a quarterly content roadmap aligned with our business objectives', label: 'Content Roadmap' },
  ],
  'Creative': [
    { title: 'Generate 10 headline variations for [product/campaign] that capture [specific emotion/benefit]', label: 'Headlines' },
    { title: 'Brainstorm creative concepts for a social media campaign about [topic/product]', label: 'Campaign Ideas' },
    { title: 'Help me write compelling ad copy that highlights [key features] for [target audience]', label: 'Ad Copy' },
    { title: 'Suggest visual directions and mood boards for [brand/campaign theme]', label: 'Visual Direction' },
  ],
  'Account Manager': [
    { title: 'Draft a client presentation outline that explains our recommended strategy for [campaign]', label: 'Presentation' },
    { title: 'Create a project timeline and milestone breakdown for [campaign type]', label: 'Timeline' },
    { title: 'Help me write a status update email addressing [client concern] while managing expectations', label: 'Status Update' },
    { title: 'Generate talking points for a kickoff meeting with a new client in [industry]', label: 'Kickoff Meeting' },
  ],
  'Social Media Manager': [
    { title: "Create a week's worth of post ideas for [platform] that align with [brand voice/campaign]", label: 'Post Ideas' },
    { title: 'Suggest engagement strategies to boost interaction on our recent [content type] posts', label: 'Engagement' },
    { title: 'Help me write responses to common customer comments/questions about [product/topic]', label: 'Responses' },
    { title: 'Generate caption variations for [type of content] that encourage shares and saves', label: 'Captions' },
  ],
  'Communication Manager': [
    { title: 'Draft a press release announcing [company news/product launch]', label: 'Press Release' },
    { title: 'Create talking points for leadership to address [issue/announcement] internally and externally', label: 'Talking Points' },
    { title: 'Help me write crisis communication guidelines for [potential scenario]', label: 'Crisis Comms' },
    { title: 'Develop key messages for our brand that can be adapted across all communication channels', label: 'Key Messages' },
  ],
  'Other': [
    { title: "Help me understand my brand's voice and tone guidelines", label: 'Brand Voice' },
    { title: 'Generate content ideas based on current trends in [industry]', label: 'Content Ideas' },
    { title: 'Create a brief template for my next campaign', label: 'Brief Template' },
    { title: 'Analyze this content and suggest improvements for [specific goal]', label: 'Content Analysis' },
  ],
};

// Fallback suggestions if role not found
const DEFAULT_SUGGESTIONS = ROLE_SUGGESTIONS['Other'];

export function getSuggestedActionsForRole(jobFunction?: string | null): Array<{ title: string; label: string }> {
  if (!jobFunction) return DEFAULT_SUGGESTIONS;
  return ROLE_SUGGESTIONS[jobFunction] || DEFAULT_SUGGESTIONS;
}

interface GreetingProps {
  userName?: string;
}

export function Greeting({ userName }: GreetingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-16 px-4">
      {/* Welcome Text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Hello there{userName ? `, ${userName}` : ''}!
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          How can I help you today?
        </p>
      </div>
    </div>
  );
}

interface SuggestedActionsProps {
  onSelect: (text: string) => void;
  jobFunction?: string | null;
}

export function SuggestedActions({ onSelect, jobFunction }: SuggestedActionsProps) {
  const suggestions = getSuggestedActionsForRole(jobFunction);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto px-4 mb-8">
      {suggestions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onSelect(action.title)}
          className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground text-left transition-all hover:bg-muted hover:border-muted-foreground/50"
        >
          {action.title}
        </button>
      ))}
    </div>
  );
}
