'use client';

import { useRef, useCallback, useEffect, KeyboardEvent, useState, ChangeEvent, useMemo, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowUp, Square, Paperclip, ChevronDown, Check, X, FileText, Image as ImageIcon, Globe, Folder, MessageSquare, GraduationCap, Minimize2, BookOpen, Briefcase, Sparkles, Server } from 'lucide-react';
import { MCPServerSelector, type MCPServer } from './mcp-server-selector';
import Image from 'next/image';

// Provider Logo Components
const AnthropicLogo = () => (
  <Image 
    src="/images/Claude_AI_logo.png" 
    alt="Claude AI" 
    width={16} 
    height={16} 
    className="shrink-0"
  />
);

const OpenAILogo = () => (
  <Image 
    src="/images/chatgpt_logo.svg" 
    alt="ChatGPT" 
    width={16} 
    height={16} 
    className="shrink-0"
  />
);

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Available AI models with feature support
export const AI_MODELS = [
  { id: 'claude-4.5', name: 'Claude 4.5', provider: 'Anthropic', icon: AnthropicLogo, supportsWebSearch: false, supportsDeepResearch: true },
  { id: 'gpt-5.2', name: 'GPT 5.2', provider: 'OpenAI', icon: OpenAILogo, supportsWebSearch: true, supportsDeepResearch: true },
  { id: 'gemini-3.1', name: 'Gemini 3.1', provider: 'Google', icon: GoogleLogo, supportsWebSearch: true, supportsDeepResearch: false },
] as const;

export type ModelId = typeof AI_MODELS[number]['id'];

// Attachment types
export interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

// Minimal project for selector
export interface MinimalProject {
	id: string;
	name: string;
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB for documents

// Predictive prompt suggestions - context-aware completions (300+ triggers)
const PROMPT_SUGGESTIONS = [
  // === ANALYSIS & UNDERSTANDING ===
  { trigger: 'help me', completion: 'understand this concept better' },
  { trigger: 'help me with', completion: 'creating a strategy for' },
  { trigger: 'help me figure out', completion: 'the best way to' },
  { trigger: 'help me understand', completion: 'how this works' },
  { trigger: 'help me write', completion: 'a professional message about' },
  { trigger: 'help me create', completion: 'a plan for' },
  { trigger: 'can you', completion: 'explain how this works' },
  { trigger: 'can you help', completion: 'me understand' },
  { trigger: 'can you show', completion: 'me an example of' },
  { trigger: 'can you explain', completion: 'the difference between' },
  { trigger: 'can you tell me', completion: 'about' },
  { trigger: 'can you describe', completion: 'how this works' },
  { trigger: 'can you give', completion: 'me a rundown on' },
  { trigger: 'can you break down', completion: 'this into simpler terms' },
  { trigger: 'can you compare', completion: 'the pros and cons of' },
  { trigger: 'can you discuss', completion: 'the benefits of' },
  { trigger: 'can you clear up', completion: 'the difference between' },
  { trigger: 'can you talk about', completion: 'the various ways to' },
  { trigger: 'what is', completion: 'the best approach for' },
  { trigger: 'what is the', completion: 'difference between' },
  { trigger: 'what are', completion: 'the best practices for' },
  { trigger: 'what are the', completion: 'key considerations for' },
  { trigger: 'what are some', completion: 'tips for' },
  { trigger: 'what would', completion: 'you recommend for' },
  { trigger: 'what should', completion: 'I consider when' },
  { trigger: 'what does', completion: 'this mean' },
  { trigger: "what's the", completion: 'best way to' },
  { trigger: "what's a good", completion: 'example of' },
  { trigger: "what's the deal with", completion: 'this approach' },
  { trigger: "what's the difference", completion: 'between' },
  { trigger: "what's the appeal of", completion: 'using' },
  { trigger: 'how do', completion: 'I implement this feature' },
  { trigger: 'how do I', completion: 'get started with' },
  { trigger: 'how can', completion: 'I improve this' },
  { trigger: 'how can I', completion: 'make this better' },
  { trigger: 'how would', completion: 'you approach this problem' },
  { trigger: 'how should', completion: 'I structure this' },
  { trigger: 'how does', completion: 'this work' },
  { trigger: 'how to', completion: 'create a successful' },
  { trigger: 'explain', completion: 'in simple terms' },
  { trigger: 'explain how', completion: 'this works step by step' },
  { trigger: 'explain the', completion: 'difference between' },
  { trigger: 'explain why', completion: 'this is important' },
  { trigger: 'why does', completion: 'this happen' },
  { trigger: 'why is', completion: 'this important' },
  { trigger: 'why would', completion: 'I use this approach' },
  { trigger: 'why do people', completion: 'use this' },
  { trigger: 'when should', completion: 'I use this' },
  { trigger: 'where can', completion: 'I find more information about' },
  { trigger: 'which is', completion: 'better for' },
  { trigger: 'which one', completion: 'should I choose' },
  
  // === ROLE PLAYING & PERSONAS ===
  { trigger: 'act like', completion: 'an expert in' },
  { trigger: 'act as', completion: 'a professional' },
  { trigger: 'act like an', completion: 'experienced consultant for' },
  { trigger: 'you are a', completion: 'helpful assistant that' },
  { trigger: 'you are an', completion: 'expert in' },
  { trigger: 'pretend you are', completion: 'a specialist in' },
  { trigger: 'imagine you are', completion: 'advising me on' },
  { trigger: 'as an expert', completion: 'in this field' },
  { trigger: 'from the perspective', completion: 'of a' },
  
  // === CONTENT CREATION ===
  { trigger: 'write', completion: 'a professional email about' },
  { trigger: 'write a', completion: 'detailed summary of' },
  { trigger: 'write an', completion: 'engaging introduction for' },
  { trigger: 'write me', completion: 'a compelling description of' },
  { trigger: 'write a blog', completion: 'post about' },
  { trigger: 'write a sales', completion: 'letter about' },
  { trigger: 'write a series', completion: 'of emails to' },
  { trigger: 'write the code', completion: 'for a' },
  { trigger: 'create', completion: 'a comprehensive guide for' },
  { trigger: 'create a', completion: 'step-by-step tutorial for' },
  { trigger: 'create an', completion: 'action plan for' },
  { trigger: 'create a list', completion: 'of' },
  { trigger: 'generate', completion: 'ideas for' },
  { trigger: 'generate a', completion: 'list of options for' },
  { trigger: 'generate some', completion: 'creative suggestions for' },
  { trigger: 'draft', completion: 'a professional message about' },
  { trigger: 'draft a', completion: 'proposal for' },
  { trigger: 'draft an', completion: 'outline for' },
  { trigger: 'compose', completion: 'an engaging message about' },
  { trigger: 'compose a', completion: 'response to' },
  { trigger: 'produce', completion: 'a detailed plan for' },
  { trigger: 'produce a', completion: 'script for' },
  { trigger: 'make', completion: 'this more concise' },
  { trigger: 'make a', completion: 'list of' },
  { trigger: 'make it', completion: 'sound more professional' },
  { trigger: 'make an outline', completion: 'for a blog post about' },
  { trigger: 'rewrite', completion: 'this in a more engaging way' },
  { trigger: 'rewrite this', completion: 'to be clearer' },
  { trigger: 'rephrase', completion: 'this to sound better' },
  { trigger: 'edit', completion: 'this for clarity and tone' },
  { trigger: 'edit this', completion: 'to be more concise' },
  { trigger: 'proofread', completion: 'this and fix any errors' },
  { trigger: 'translate', completion: 'this into' },
  { trigger: 'translate this', completion: 'to Spanish' },
  { trigger: 'craft', completion: 'an attention-grabbing' },
  { trigger: 'craft a', completion: 'compelling headline for' },
  { trigger: 'construct', completion: 'a persuasive argument for' },
  { trigger: 'construct a', completion: 'detailed response to' },
  
  // === COPYWRITING & MARKETING ===
  { trigger: 'come up with', completion: 'catchy headlines for' },
  { trigger: 'come up', completion: 'with ideas for' },
  { trigger: 'give me a CTA', completion: 'that creates urgency' },
  { trigger: 'give me a script', completion: 'for a 30-second video about' },
  { trigger: 'use the', completion: 'PAS marketing formula for' },
  { trigger: 'write 10', completion: 'creative taglines for' },
  { trigger: 'create 5', completion: 'catchy headlines for' },
  { trigger: 'brainstorm 10', completion: 'ideas for' },
  
  // === COMPARISON & ANALYSIS ===
  { trigger: 'compare', completion: 'the pros and cons of' },
  { trigger: 'compare and', completion: 'contrast these options' },
  { trigger: 'analyze', completion: 'the key aspects of' },
  { trigger: 'analyze this', completion: 'and provide insights' },
  { trigger: 'summarize', completion: 'the main points of' },
  { trigger: 'summarize this', completion: 'in bullet points' },
  { trigger: 'review', completion: 'and provide feedback on' },
  { trigger: 'review this', completion: 'for potential improvements' },
  { trigger: 'evaluate', completion: 'the effectiveness of' },
  { trigger: 'evaluate this', completion: 'approach' },
  { trigger: 'assess', completion: 'the risks and benefits of' },
  { trigger: 'break down', completion: 'this into smaller parts' },
  { trigger: 'break this', completion: 'down step by step' },
  { trigger: 'critique', completion: 'this and suggest improvements' },
  { trigger: 'present the', completion: 'information in a table' },
  { trigger: 'present this', completion: 'data visually' },
  
  // === PROBLEM SOLVING ===
  { trigger: 'fix', completion: 'the issue with' },
  { trigger: 'fix this', completion: 'error in my code' },
  { trigger: 'debug', completion: 'this problem' },
  { trigger: 'debug this', completion: 'and explain what went wrong' },
  { trigger: 'solve', completion: 'this challenge' },
  { trigger: 'solve this', completion: 'problem for me' },
  { trigger: 'improve', completion: 'the performance of' },
  { trigger: 'improve this', completion: 'to make it better' },
  { trigger: 'optimize', completion: 'this for better results' },
  { trigger: 'optimize this', completion: 'code for performance' },
  { trigger: 'troubleshoot', completion: 'this issue' },
  { trigger: 'troubleshoot why', completion: 'this is not working' },
  { trigger: 'refactor', completion: 'this code to be cleaner' },
  { trigger: 'refactor this', completion: 'for better maintainability' },
  { trigger: 'simplify', completion: 'this explanation' },
  { trigger: 'simplify this', completion: 'to make it easier to understand' },
  
  // === BRAND & MARKETING ===
  { trigger: 'suggest', completion: 'ways to enhance our brand' },
  { trigger: 'suggest some', completion: 'improvements for' },
  { trigger: 'brainstorm', completion: 'creative ideas for' },
  { trigger: 'brainstorm some', completion: 'marketing strategies for' },
  { trigger: 'design', completion: 'a strategy for' },
  { trigger: 'design a', completion: 'campaign around' },
  { trigger: 'plan', completion: 'the next steps for' },
  { trigger: 'plan a', completion: 'roadmap for' },
  { trigger: 'develop', completion: 'a content strategy for' },
  { trigger: 'develop a', completion: 'marketing plan for' },
  { trigger: 'outline', completion: 'a strategy for' },
  { trigger: 'outline the', completion: 'key points of' },
  { trigger: 'pitch', completion: 'this idea in a compelling way' },
  { trigger: 'position', completion: 'our brand as' },
  { trigger: 'differentiate', completion: 'our offering from competitors' },
  { trigger: 'the impact of', completion: 'this on our brand' },
  { trigger: 'the benefits of', completion: 'content marketing for' },
  { trigger: 'the importance of', completion: 'brand storytelling in' },
  { trigger: 'the role of', completion: 'customer experience in' },
  
  // === RESEARCH & LEARNING ===
  { trigger: 'research', completion: 'the latest trends in' },
  { trigger: 'research about', completion: 'best practices for' },
  { trigger: 'learn', completion: 'more about' },
  { trigger: 'learn about', completion: 'the fundamentals of' },
  { trigger: 'teach me', completion: 'how to' },
  { trigger: 'teach me about', completion: 'the basics of' },
  { trigger: 'walk me', completion: 'through the process of' },
  { trigger: 'walk me through', completion: 'step by step' },
  { trigger: 'guide me', completion: 'through setting up' },
  { trigger: 'guide me on', completion: 'how to approach' },
  { trigger: 'describe', completion: 'how this works' },
  { trigger: 'describe the', completion: 'process for' },
  { trigger: 'define', completion: 'this term' },
  { trigger: 'define the', completion: 'key concepts of' },
  
  // === QUICK ACTIONS ===
  { trigger: 'tell me', completion: 'more about' },
  { trigger: 'tell me about', completion: 'the best way to' },
  { trigger: 'tell a personal', completion: 'story about' },
  { trigger: 'show me', completion: 'an example of' },
  { trigger: 'show me how', completion: 'to do this' },
  { trigger: 'give me', completion: 'a detailed breakdown of' },
  { trigger: 'give me a', completion: 'quick summary of' },
  { trigger: 'give me some', completion: 'examples of' },
  { trigger: 'give me step-by-step', completion: 'instructions to' },
  { trigger: 'list', completion: 'the top recommendations for' },
  { trigger: 'list all', completion: 'the options for' },
  { trigger: 'list the', completion: 'steps to' },
  { trigger: 'list the most', completion: 'frequently asked questions about' },
  { trigger: 'find', completion: 'the best solution for' },
  { trigger: 'find me', completion: 'resources about' },
  { trigger: 'get', completion: 'me started with' },
  { trigger: 'get me', completion: 'up to speed on' },
  { trigger: 'only explain', completion: 'this part' },
  { trigger: "don't write about", completion: 'anything except' },
  
  // === CODE & TECHNICAL ===
  { trigger: 'code', completion: 'a function that' },
  { trigger: 'code a', completion: 'solution for' },
  { trigger: 'build', completion: 'a component that' },
  { trigger: 'build a', completion: 'feature for' },
  { trigger: 'build an app', completion: 'that' },
  { trigger: 'implement', completion: 'a solution for' },
  { trigger: 'implement this', completion: 'feature' },
  { trigger: 'add', completion: 'functionality for' },
  { trigger: 'add a', completion: 'new feature that' },
  { trigger: 'convert', completion: 'this to' },
  { trigger: 'convert this', completion: 'into a different format' },
  { trigger: 'format', completion: 'this data as' },
  { trigger: 'format this', completion: 'properly' },
  { trigger: 'test', completion: 'this functionality' },
  { trigger: 'test this', completion: 'and find any issues' },
  { trigger: 'validate', completion: 'this approach' },
  { trigger: 'validate this', completion: 'input' },
  { trigger: 'write a python', completion: 'script for' },
  { trigger: 'write the code', completion: 'for a chrome extension that' },
  { trigger: 'please write me', completion: 'a detailed code to build' },
  { trigger: 'please give me', completion: 'a guide on how to' },
  { trigger: 'please provide', completion: 'a JavaScript code for' },
  { trigger: 'what is the html', completion: 'code for' },
  
  // === COMMUNICATION ===
  { trigger: 'respond', completion: 'to this message professionally' },
  { trigger: 'respond to', completion: 'this inquiry' },
  { trigger: 'reply', completion: 'to this email' },
  { trigger: 'reply to', completion: 'this feedback' },
  { trigger: 'answer', completion: 'this question' },
  { trigger: 'answer the', completion: 'following' },
  { trigger: 'clarify', completion: 'this point' },
  { trigger: 'clarify the', completion: 'requirements for' },
  { trigger: 'elaborate', completion: 'on this topic' },
  { trigger: 'elaborate on', completion: 'the details of' },
  { trigger: 'expand', completion: 'on this idea' },
  { trigger: 'expand this', completion: 'into more detail' },
  { trigger: 'for this target', completion: 'audience' },
  
  // === DATA & NUMBERS ===
  { trigger: 'calculate', completion: 'the total for' },
  { trigger: 'calculate the', completion: 'difference between' },
  { trigger: 'estimate', completion: 'the time needed for' },
  { trigger: 'estimate how', completion: 'long this will take' },
  { trigger: 'count', completion: 'the number of' },
  { trigger: 'measure', completion: 'the impact of' },
  { trigger: 'quantify', completion: 'the results of' },
  
  // === ORGANIZATION & PLANNING ===
  { trigger: 'organize', completion: 'this information' },
  { trigger: 'organize this', completion: 'into categories' },
  { trigger: 'prioritize', completion: 'these tasks' },
  { trigger: 'prioritize the', completion: 'most important items' },
  { trigger: 'schedule', completion: 'the timeline for' },
  { trigger: 'schedule a', completion: 'plan for' },
  { trigger: 'structure', completion: 'this document' },
  { trigger: 'structure the', completion: 'content for' },
  { trigger: 'categorize', completion: 'these items' },
  { trigger: 'categorize this', completion: 'information' },
  { trigger: 'sort', completion: 'these options by' },
  { trigger: 'sort this', completion: 'list' },
  { trigger: 'rank', completion: 'these options' },
  { trigger: 'rank the', completion: 'priorities for' },
  
  // === CREATIVE & IDEATION ===
  { trigger: 'imagine', completion: 'a scenario where' },
  { trigger: 'imagine if', completion: 'we could' },
  { trigger: 'think of', completion: 'ways to' },
  { trigger: 'think about', completion: 'how we could' },
  { trigger: 'come up', completion: 'with ideas for' },
  { trigger: 'explore', completion: 'the possibilities of' },
  { trigger: 'explore how', completion: 'we can' },
  { trigger: 'consider', completion: 'the implications of' },
  { trigger: 'consider how', completion: 'to approach' },
  { trigger: 'propose', completion: 'a solution for' },
  { trigger: 'propose a', completion: 'new approach to' },
  { trigger: 'invent', completion: 'a creative way to' },
  { trigger: 'innovate', completion: 'on this concept' },
  
  // === CONVERSATIONAL STARTERS ===
  { trigger: 'i need', completion: 'help with' },
  { trigger: 'i need to', completion: 'figure out how to' },
  { trigger: 'i need a', completion: 'solution for' },
  { trigger: 'i want', completion: 'to understand' },
  { trigger: 'i want to', completion: 'learn more about' },
  { trigger: 'i want you to', completion: 'help me with' },
  { trigger: "i'm trying to", completion: 'figure out' },
  { trigger: "i'm looking for", completion: 'a way to' },
  { trigger: "i'm working on", completion: 'a project about' },
  { trigger: "i'm struggling with", completion: 'understanding' },
  { trigger: 'could you', completion: 'help me understand' },
  { trigger: 'could you please', completion: 'explain' },
  { trigger: 'would you', completion: 'be able to help with' },
  { trigger: 'would you mind', completion: 'explaining' },
  { trigger: 'is there a', completion: 'way to' },
  { trigger: 'is it possible', completion: 'to' },
  { trigger: "i'd like to", completion: 'know more about' },
  { trigger: "i'd like you to", completion: 'help me' },
  { trigger: 'let me know', completion: 'the best way to' },
  { trigger: 'do you know', completion: 'how to' },
  { trigger: 'do you have', completion: 'any suggestions for' },
  
  // === SPECIFIC FORMATS ===
  { trigger: 'in a table', completion: 'format' },
  { trigger: 'as a list', completion: 'with bullet points' },
  { trigger: 'as a json', completion: 'object' },
  { trigger: 'in markdown', completion: 'format' },
  { trigger: 'with examples', completion: 'and explanations' },
  { trigger: 'with code', completion: 'examples' },
  { trigger: 'step by step', completion: 'guide for' },
  { trigger: 'in detail', completion: 'please explain' },
  { trigger: 'briefly', completion: 'explain' },
  { trigger: 'a long explanation', completion: 'of' },
  
  // === QUESTIONS ABOUT TOOLS/TECH ===
  { trigger: 'using', completion: 'this tool for' },
  { trigger: 'leveraging', completion: 'the power of' },
  { trigger: 'maximizing', completion: 'the ROI of' },
  { trigger: 'integrating', completion: 'this with' },
  { trigger: 'best practices for', completion: 'creating' },
];

// AI mention triggers for collaborative chats
const AI_MENTIONS = [
  '@AI',
  '@Claude',
  '@GPT', 
  '@Gemini',
  '@Assistant',
] as const;

// Check if message contains an AI mention (case-insensitive, allows space after @)
export function hasAIMention(text: string): boolean {
  const lowerText = text.toLowerCase();
  // Check exact mentions first
  if (AI_MENTIONS.some(mention => lowerText.includes(mention.toLowerCase()))) {
    return true;
  }
  // Also check for mentions with optional space after @ (e.g., "@ ai", "@ gpt")
  const mentionNames = AI_MENTIONS.map(m => m.slice(1).toLowerCase()); // ['ai', 'claude', 'gpt', 'gemini', 'assistant']
  return mentionNames.some(name => {
    const regex = new RegExp(`@\\s*${name}\\b`, 'i');
    return regex.test(text);
  });
}

// Remove AI mentions from message for cleaner display
export function removeAIMentions(text: string): string {
  let result = text;
  for (const mention of AI_MENTIONS) {
    const regex = new RegExp(mention, 'gi');
    result = result.replace(regex, '').trim();
  }
  // Clean up any double spaces
  return result.replace(/\s+/g, ' ').trim();
}

// Style presets for AI responses
const STYLE_PRESETS = [
  { id: 'normal' as const, label: 'Normal', icon: MessageSquare },
  { id: 'learning' as const, label: 'Learning', icon: GraduationCap },
  { id: 'concise' as const, label: 'Concise', icon: Minimize2 },
  { id: 'explanatory' as const, label: 'Explanatory', icon: BookOpen },
  { id: 'formal' as const, label: 'Formal', icon: Briefcase },
];

export type StylePreset = typeof STYLE_PRESETS[number]['id'];

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
	onSubmit: (attachments?: Attachment[], options?: { useWebSearch?: boolean; useDeepResearch?: boolean; mcpServerIds?: string[] }) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
	// Project selection
	projects?: MinimalProject[];
	currentProjectId?: string | null;
	currentConversationProjectId?: string | null;
	onSelectProject?: (projectId: string | null) => void;
	onCreateProject?: (name: string, color?: string) => Promise<string | undefined>;
	onMoveConversationToProject?: (projectId: string) => void;
	onClearProject?: () => void;
	// Style selection
	currentConversationStylePreset?: StylePreset | null;
	onStyleChange?: (style: StylePreset) => void;
	// MCP server selection
	brandId?: string;
	selectedMcpServerIds?: string[];
	onMcpServerSelectionChange?: (serverIds: string[]) => void;
	onMcpServersLoaded?: (servers: MCPServer[]) => void;
	// Collaborative chat mode - requires @mention to invoke AI
	isCollaborative?: boolean;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onStop,
  isStreaming = false,
  isLoading = false,
  placeholder = 'Send a message...',
  disabled = false,
  model = 'claude-4.5',
  onModelChange,
	projects = [],
	currentProjectId = null,
	currentConversationProjectId = null,
	onSelectProject,
	onCreateProject,
	onMoveConversationToProject,
	onClearProject,
	currentConversationStylePreset = null,
	onStyleChange,
	brandId,
	selectedMcpServerIds = [],
	onMcpServerSelectionChange,
	onMcpServersLoaded,
	isCollaborative = false,
}: ChatInputProps) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [prediction, setPrediction] = useState<string>('');
	const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
	const [useDeepResearch, setUseDeepResearch] = useState<boolean>(false);
	const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
	const [isMcpLoading, setIsMcpLoading] = useState(false);
	const [showMentionHint, setShowMentionHint] = useState<string | null>(null);
	const [showMcpSelector, setShowMcpSelector] = useState(false);
  const selectedModel = AI_MODELS.find(m => m.id === model) || AI_MODELS[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch MCP servers when brandId changes
  useEffect(() => {
    if (!brandId) return;
    
    const fetchServers = async () => {
      setIsMcpLoading(true);
      try {
        const response = await fetch(`/api/mcp/servers?brandId=${brandId}`);
        const data = await response.json();
        if (response.ok && data.servers) {
          setMcpServers(data.servers);
          onMcpServersLoaded?.(data.servers);
        }
      } catch (error) {
        console.error('Failed to fetch MCP servers:', error);
      } finally {
        setIsMcpLoading(false);
      }
    };
    
    fetchServers();
  }, [brandId, onMcpServersLoaded]);

  // Toggle MCP server selection
  const handleToggleMcpServer = (serverId: string) => {
    if (!onMcpServerSelectionChange) return;
    const isSelected = selectedMcpServerIds.includes(serverId);
    if (isSelected) {
      onMcpServerSelectionChange(selectedMcpServerIds.filter(id => id !== serverId));
    } else {
      onMcpServerSelectionChange([...selectedMcpServerIds, serverId]);
    }
  };

  // Clear features when switching to a model that doesn't support them
  useEffect(() => {
    if (useWebSearch && !selectedModel.supportsWebSearch) {
      setUseWebSearch(false);
    }
    if (useDeepResearch && !selectedModel.supportsDeepResearch) {
      setUseDeepResearch(false);
    }
  }, [model, selectedModel.supportsWebSearch, selectedModel.supportsDeepResearch, useWebSearch, useDeepResearch]);

  // Check for @mention autocomplete
  const findMentionSuggestion = useCallback((text: string): string | null => {
    if (!text) return null;
    // Check if user is typing an @mention
    const atIndex = text.lastIndexOf('@');
    if (atIndex === -1) return null;
    
    const afterAt = text.slice(atIndex + 1).toLowerCase();
    if (afterAt.length === 0) return 'AI'; // Suggest @AI when just @ is typed
    
    // Find matching mention
    for (const mention of AI_MENTIONS) {
      const mentionName = mention.slice(1).toLowerCase(); // Remove @ prefix
      if (mentionName.startsWith(afterAt) && afterAt.length < mentionName.length) {
        return mentionName.slice(afterAt.length); // Return rest of mention
      }
    }
    return null;
  }, []);

  // Find matching prediction based on input
  const findPrediction = useCallback((text: string): string => {
    if (!text || text.length < 2) return '';
    
    const lowerText = text.toLowerCase().trim();
    
    // Find a suggestion that matches the start of what user is typing
    for (const suggestion of PROMPT_SUGGESTIONS) {
      const trigger = suggestion.trigger.toLowerCase();
      
      // If user text starts with part of the trigger
      if (trigger.startsWith(lowerText) && lowerText.length < trigger.length) {
        // Return the rest of the trigger + completion
        return trigger.slice(lowerText.length) + ' ' + suggestion.completion;
      }
      
      // If user text exactly matches or extends past the trigger
      if (lowerText.startsWith(trigger) && lowerText.length >= trigger.length) {
        const afterTrigger = lowerText.slice(trigger.length).trim();
        const completionLower = suggestion.completion.toLowerCase();
        
        // If there's nothing after trigger, suggest the full completion
        if (!afterTrigger) {
          return ' ' + suggestion.completion;
        }
        
        // If what's after trigger starts matching completion, suggest the rest
        if (completionLower.startsWith(afterTrigger) && afterTrigger.length < completionLower.length) {
          return suggestion.completion.slice(afterTrigger.length);
        }
      }
    }
    
    return '';
  }, []);

  // Update prediction when input changes (debounced)
  useEffect(() => {
    if (predictionTimeoutRef.current) {
      clearTimeout(predictionTimeoutRef.current);
    }
    
    if (!input || isStreaming || isLoading) {
      setPrediction('');
      return;
    }
    
    // Debounce prediction to avoid flickering
    predictionTimeoutRef.current = setTimeout(() => {
      // First check for @mention suggestions
      const mentionSuggestion = findMentionSuggestion(input);
      if (mentionSuggestion) {
        setPrediction(mentionSuggestion);
        setShowMentionHint(mentionSuggestion);
        return;
      }
      setShowMentionHint(null);
      
      const newPrediction = findPrediction(input);
      setPrediction(newPrediction);
    }, 100);
    
    return () => {
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
    };
  }, [input, isStreaming, isLoading, findPrediction, findMentionSuggestion]);

  // Accept prediction with Tab
  const acceptPrediction = useCallback(() => {
    if (prediction) {
      setInput(input + prediction);
      setPrediction('');
    }
  }, [input, prediction, setInput]);

  // Handle file selection
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    Array.from(files).forEach((file) => {
      // Determine file type first
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

      if (!isImage && !isDocument) {
        alert(`File type "${file.type}" is not supported. Please use images (JPEG, PNG, GIF, WebP) or documents (PDF, TXT, MD).`);
        return;
      }

      // Check file size based on type
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
      if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size for ${isImage ? 'images' : 'documents'} is ${sizeMB}MB.`);
        return;
      }

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'document',
      };

      // Create preview for images
      if (isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Handle paste event for images
  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    
    // Check for image items in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        imageItems.push(item);
      }
    }

    // If no images, let default paste behavior handle it
    if (imageItems.length === 0) return;

    // Prevent default to stop image data from being pasted as text
    e.preventDefault();

    const newAttachments: Attachment[] = [];

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert(`Image type "${file.type}" is not supported. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`Pasted image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${(MAX_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB.`);
        return;
      }

      // Create attachment with preview
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: 'image',
        preview: URL.createObjectURL(file),
      };

      newAttachments.push(attachment);
    });

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
    };
  }, []);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab to accept prediction
    if (e.key === 'Tab' && prediction) {
      e.preventDefault();
      acceptPrediction();
      return;
    }
    
    // Escape to dismiss prediction
    if (e.key === 'Escape' && prediction) {
      e.preventDefault();
      setPrediction('');
      return;
    }
    
    // Right arrow at end of input accepts prediction
    if (e.key === 'ArrowRight' && prediction && textareaRef.current) {
      const { selectionStart, selectionEnd, value } = textareaRef.current;
      if (selectionStart === selectionEnd && selectionStart === value.length) {
        e.preventDefault();
        acceptPrediction();
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setPrediction(''); // Clear prediction on submit
      if (!disabled && !isLoading && !isStreaming && (input.trim() || attachments.length > 0)) {
				onSubmit(attachments.length > 0 ? attachments : undefined, { useWebSearch, useDeepResearch, mcpServerIds: selectedMcpServerIds });
        setAttachments([]);
        resetHeight();
      }
    }
  };

  const handleSubmit = () => {
    if (!disabled && !isLoading && !isStreaming && (input.trim() || attachments.length > 0)) {
			onSubmit(attachments.length > 0 ? attachments : undefined, { useWebSearch, useDeepResearch, mcpServerIds: selectedMcpServerIds });
      setAttachments([]);
      resetHeight();
    }
  };

  const isReady = !isStreaming && !isLoading;
  const canSend = isReady && (input.trim() || attachments.length > 0);

  return (
    <div className="relative flex w-full flex-col">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="rounded-2xl border border-border bg-muted/50 overflow-hidden">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative size-10 rounded overflow-hidden">
                    <Image
                      src={attachment.preview}
                      alt={attachment.file.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center size-10 rounded bg-muted">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col max-w-[120px]">
                  <span className="text-xs font-medium truncate">{attachment.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(attachment.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Row with Predictive Text */}
        <div className="px-4 py-3 relative">
          {/* Ghost text layer - shows prediction */}
          <div
            aria-hidden="true"
            className="absolute inset-0 px-4 py-3 pointer-events-none overflow-hidden"
          >
            <div className="text-sm whitespace-pre-wrap break-words">
              {/* Invisible text matching input to position ghost text correctly */}
              <span className="invisible">{input}</span>
              {/* Ghost text prediction */}
              {prediction && (
                <span className="text-muted-foreground/50">{prediction}</span>
              )}
            </div>
          </div>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'w-full min-h-[24px] max-h-[200px] resize-none bg-transparent text-sm',
              'focus:outline-none relative z-10',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            rows={1}
          />
          
          {/* Tab hint */}
          {prediction && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/50">
                Tab
              </span>
            </div>
          )}
        </div>


        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          {/* Left side - Attachment + Model Selector */}
          <div className="flex items-center gap-1">
						{/* Plus menu */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
									disabled={disabled || !isReady}
								>
									<span className="sr-only">More options</span>
									{/* simple plus glyph */}
									<span className="text-lg leading-none">+</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuItem
									onClick={() => fileInputRef.current?.click()}
									className="flex items-center gap-2"
								>
									<Paperclip className="size-4" />
									<span>Add files or images</span>
								</DropdownMenuItem>
								{/* Web Search - auto-switch model if needed */}
								<DropdownMenuItem
									onClick={() => {
										if (!useWebSearch) {
											// Turning on - check if model supports it
											if (!selectedModel.supportsWebSearch) {
												// Find first model that supports web search
												const webSearchModel = AI_MODELS.find(m => m.supportsWebSearch);
												if (webSearchModel && onModelChange) {
													onModelChange(webSearchModel.id);
												}
											}
											setUseWebSearch(true);
										} else {
											setUseWebSearch(false);
										}
									}}
									className="flex items-center justify-between gap-2"
								>
									<div className="flex items-center gap-2">
										<Globe className="size-4" />
										<span>Web Search</span>
									</div>
									{useWebSearch ? <Check className="size-4" /> : null}
								</DropdownMenuItem>
								{/* Deep Research - auto-switch model if needed */}
								<DropdownMenuItem
									onClick={() => {
										if (!useDeepResearch) {
											// Turning on - check if model supports it
											if (!selectedModel.supportsDeepResearch) {
												// Find first model that supports deep research
												const deepResearchModel = AI_MODELS.find(m => m.supportsDeepResearch);
												if (deepResearchModel && onModelChange) {
													onModelChange(deepResearchModel.id);
												}
											}
											setUseDeepResearch(true);
										} else {
											setUseDeepResearch(false);
										}
									}}
									className="flex items-center justify-between gap-2"
								>
									<div className="flex items-center gap-2">
										<Sparkles className="size-4" />
										<span>Deep Research</span>
									</div>
									{useDeepResearch ? <Check className="size-4" /> : null}
								</DropdownMenuItem>
								{/* Connections submenu - only show enabled servers */}
								{mcpServers.filter(s => s.enabled).length > 0 && (
									<DropdownMenuSub>
										<DropdownMenuSubTrigger className="flex items-center gap-2">
											<Server className="size-4" />
											<span>Connections</span>
											{selectedMcpServerIds.length > 0 && (
												<span className="ml-auto text-xs text-muted-foreground">
													{selectedMcpServerIds.length}
												</span>
											)}
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent className="w-56">
											<TooltipProvider delayDuration={300}>
												{mcpServers.filter(s => s.enabled).map((server) => {
													const isSelected = selectedMcpServerIds.includes(server.id);
													const menuItem = (
														<DropdownMenuItem
															key={server.id}
															onClick={() => handleToggleMcpServer(server.id)}
															className="flex items-center justify-between gap-2"
														>
															<div className="flex items-center gap-2">
																<Server className="size-4" />
																<span>{server.name}</span>
															</div>
															{isSelected ? <Check className="size-4 text-green-500" /> : null}
														</DropdownMenuItem>
													);
													
													if (server.description) {
														return (
															<Tooltip key={server.id}>
																<TooltipTrigger asChild>
																	{menuItem}
																</TooltipTrigger>
																<TooltipContent side="right" className="max-w-[200px]">
																	<p className="text-xs">{server.description}</p>
																</TooltipContent>
															</Tooltip>
														);
													}
													return menuItem;
												})}
											</TooltipProvider>
										</DropdownMenuSubContent>
									</DropdownMenuSub>
								)}
								{/* Models submenu */}
								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center gap-2">
										<selectedModel.icon />
										<span>Models</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-56">
										{AI_MODELS.map((m) => (
											<DropdownMenuItem
												key={m.id}
												onClick={() => onModelChange?.(m.id)}
												className="flex items-center justify-between gap-3"
											>
												<div className="flex items-center gap-3">
													<m.icon />
													<div className="flex flex-col">
														<div className="font-medium text-sm">{m.name}</div>
														<div className="text-xs text-muted-foreground">{m.provider}</div>
													</div>
												</div>
												{model === m.id && <Check className="size-4 shrink-0" />}
											</DropdownMenuItem>
										))}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							</DropdownMenuContent>
						</DropdownMenu>
            
            {/* Connections button - opens MCP server selector */}
            {mcpServers.length > 0 && (
              <DropdownMenu open={showMcpSelector} onOpenChange={setShowMcpSelector}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      selectedMcpServerIds.length > 0
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    disabled={disabled || !isReady}
                    title={`Connections (${selectedMcpServerIds.length} active)`}
                  >
                    <Server className="size-4" />
                    {selectedMcpServerIds.length > 0 && (
                      <span className="text-xs font-medium">{selectedMcpServerIds.length}</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Connections
                  </div>
                  {mcpServers.map((server) => (
                    <DropdownMenuItem
                      key={server.id}
                      onClick={() => handleToggleMcpServer(server.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Server className="size-4" />
                        <span>{server.name}</span>
                      </div>
                      {selectedMcpServerIds.includes(server.id) && (
                        <Check className="size-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

						{/* MCP Tools active chips - show each selected server by name */}
						{selectedMcpServerIds.map((serverId) => {
							const server = mcpServers.find(s => s.id === serverId);
							if (!server) return null;
							return (
								<button
									key={serverId}
									onClick={() => handleToggleMcpServer(serverId)}
									className="group ml-1 inline-flex items-center gap-1.5 rounded-md bg-muted border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted/80 transition-colors"
								>
									<Server className="size-3.5" />
									<span>{server.name}</span>
									<X className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
								</button>
							);
						})}

						{/* Web Search active chip */}
						{useWebSearch && (
							<button
								onClick={() => setUseWebSearch(false)}
								className="group ml-1 inline-flex items-center gap-1.5 rounded-md bg-[#063EF8] px-2.5 py-1 text-xs text-white hover:bg-[#063EF8]/90 transition-colors"
							>
								<Globe className="size-3.5" />
								<span>Search</span>
							</button>
						)}
						{/* Deep Research active chip */}
						{useDeepResearch && (
							<button
								onClick={() => setUseDeepResearch(false)}
								className="group ml-1 inline-flex items-center gap-1.5 rounded-md bg-[#063EF8] px-2.5 py-1 text-xs text-white hover:bg-[#063EF8]/90 transition-colors"
							>
								<Sparkles className="size-3.5" />
								<span>Deep Research</span>
							</button>
						)}
					{/* Project selected chip */}
					{currentConversationProjectId && projects.length > 0 && (
						(() => {
							const p = projects.find(pj => pj.id === currentConversationProjectId);
							if (!p) return null;
							return (
								<button
									onClick={onClearProject}
									className="group ml-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground max-w-[140px] hover:bg-muted/80 transition-colors"
								>
									<Folder className="size-3" />
									<span className="truncate">Project: {p.name}</span>
									<X className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
								</button>
							);
						})()
					)}
					{/* Style selected chip */}
					{currentConversationStylePreset && currentConversationStylePreset !== 'normal' && (
						<button
							onClick={() => onStyleChange?.('normal')}
							className="group ml-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground hover:bg-muted/80 transition-colors"
						>
							<Sparkles className="size-3" />
							<span className="capitalize">{currentConversationStylePreset}</span>
							<X className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>
					)}
          </div>

          {/* Right side - Send/Stop Button */}
          <div className="flex items-center">
            {isStreaming ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={onStop}
              >
                <Square className="size-4 fill-current" />
                <span className="sr-only">Stop generating</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  'size-8 rounded-lg transition-colors',
                  canSend 
                    ? 'bg-foreground text-background hover:bg-foreground/90' 
                    : 'text-muted-foreground cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
                )}
                disabled={!canSend}
                onClick={handleSubmit}
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
