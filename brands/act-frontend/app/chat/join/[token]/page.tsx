'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, MessageSquare, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InviteDetails {
  id: string;
  conversationId: string;
  conversationTitle: string;
  permission: 'read' | 'write';
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

export default function JoinChatPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/conversation-invite-links?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invite link');
          return;
        }

        setInvite(data.invite);
      } catch (err) {
        setError('Failed to load invite details');
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/conversation-invite-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join');
        return;
      }

      setSuccess(true);
      
      // Redirect to the conversation after a short delay
      setTimeout(() => {
        router.push(`/dashboard/chat?c=${data.conversationId}`);
      }, 1500);
    } catch (err) {
      setError('Failed to join chat');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="size-6 text-green-500" />
            </div>
            <CardTitle>You&apos;re in!</CardTitle>
            <CardDescription>
              Redirecting you to the chat...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>
          <CardTitle>Join Collaborative Chat</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invite && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="size-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invite.conversationTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invite.createdBy.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Access level</span>
                <span className="font-medium capitalize">
                  {invite.permission === 'write' ? 'Can edit & chat' : 'View only'}
                </span>
              </div>

              {invite.expiresAt && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Expires</span>
                  <span>{new Date(invite.expiresAt).toLocaleDateString()}</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Chat'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
