// Components are implemented in individual brand packages
// This file re-exports types for component props

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  avatar?: string;
  userName?: string;
}

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export interface MessageListProps {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  userAvatar?: string;
  userName?: string;
}
