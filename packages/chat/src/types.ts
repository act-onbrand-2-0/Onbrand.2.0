/**
 * Chat types with brand isolation support
 */

export interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  model: ChatModel;
  system_prompt: string | null;
  settings: ChatSettings;
  total_tokens_used: number;
  total_cost_usd: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tokens_used: number;
  model: string;
  metadata: MessageMetadata;
  created_at: string;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

export type ChatModel = 
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku';

export interface ChatSettings {
  temperature: number;
  max_tokens: number;
  top_p: number;
}

export interface MessageMetadata {
  attachments?: Attachment[];
  function_call?: FunctionCall;
  [key: string]: unknown;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

// Brand context for chat isolation
export interface BrandContext {
  brandId: string;
  brandName?: string;
  systemPrompt?: string;
  allowedModels?: ChatModel[];
}

// Chat state
export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

// Chat actions
export type ChatAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation | null }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: Partial<Conversation> & { id: string } }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Partial<Message> & { id: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Create conversation input
export interface CreateConversationInput {
  title: string;
  model?: ChatModel;
  system_prompt?: string;
  settings?: Partial<ChatSettings>;
}

// Send message input
export interface SendMessageInput {
  content: string;
  attachments?: Attachment[];
}

// Chat hook return type
export interface UseChatReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  stopGeneration: () => void;
  clearError: () => void;
}
