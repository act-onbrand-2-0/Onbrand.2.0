"use client";

interface WelcomeSectionProps {
  userName?: string;
}

export function WelcomeSection({ userName }: WelcomeSectionProps) {
  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className="text-center space-y-2">
      <h2 className="text-xl sm:text-2xl font-semibold">
        Welcome Back, {firstName}!
      </h2>
      <p className="text-sm sm:text-base text-muted-foreground">
        How can I help you today?
      </p>
    </div>
  );
}
