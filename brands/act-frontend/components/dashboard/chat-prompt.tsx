"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardChatPrompt() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // Store the initial message in sessionStorage so the chat page can pick it up
    sessionStorage.setItem("dashboard_initial_message", input.trim());
    
    // Navigate to chat page
    router.push("/chat");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-full border bg-card transition-all duration-200",
          isFocused 
            ? "border-[#889def] ring-2 ring-[#889def]/20 shadow-lg" 
            : "border-border hover:border-muted-foreground/50 shadow-sm"
        )}
      >
        {/* Briefcase Icon */}
        <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
        
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
        
        {/* Submit Button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-8 w-8 rounded-full shrink-0 transition-all",
            input.trim() 
              ? "bg-foreground text-background hover:bg-foreground/90" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={handleSubmit}
          disabled={!input.trim()}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

