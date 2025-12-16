/* eslint-disable @next/next/no-img-element */
// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/lib/use-user";

export default function ChatPage() {
	const { user } = useUser();
	const { messages, input, handleInputChange, handleSubmit, error, isLoading } = useChat({
		api: "/api/chat",
		onError: (err) => {
			console.error("Chat error:", err);
		},
		onFinish: (message) => {
			console.log("Chat finished:", message);
		},
	});

	// Load history (optional simple list)
	const [history, setHistory] = useState<any[]>([]);
	const [debugMsg, setDebugMsg] = useState("");

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/history");
				if (res.ok) {
					setHistory(await res.json());
				}
			} catch (_) {
				/* ignore */
			}
		})();
	}, []);

	// Debug: manual API test
	const testAPI = async () => {
		setDebugMsg("Testing...");
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "Hello test" }],
				}),
			});
			if (!res.ok) {
				const text = await res.text();
				setDebugMsg(`Error ${res.status}: ${text}`);
			} else {
				setDebugMsg(`Success ${res.status}`);
			}
		} catch (e: any) {
			setDebugMsg(`Fetch error: ${e.message}`);
		}
	};

	return (
		<div className="container mx-auto p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Chat</h1>
				<div className="flex gap-2 items-center">
					<Button size="sm" variant="outline" onClick={testAPI}>
						Test API
					</Button>
					<div className="text-sm text-muted-foreground">
						{user ? `Signed in` : `Not signed in`}
					</div>
				</div>
			</div>
			{debugMsg && (
				<div className="p-2 bg-yellow-100 text-yellow-900 rounded text-sm">
					{debugMsg}
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-3">
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Conversation</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="min-h-[320px] max-h-[60vh] overflow-y-auto rounded border p-3 space-y-3">
							{messages.map((m: any) => {
								const text =
									typeof m.content === "string" && m.content.length > 0
										? m.content
										: Array.isArray(m.parts)
										? (m.parts
												.filter((p: any) => p?.type === "text")
												.map((p: any) => p.text)
												.join("") as string)
										: "";
								return (
									<div key={m.id} className="space-y-1">
										<div className="text-xs uppercase text-muted-foreground">
											{m.role}
										</div>
										<div className="whitespace-pre-wrap">
											{text || ""}
										</div>
									</div>
								);
							})}
							{error && (
								<div className="text-sm text-red-600">
									{String(error.message || "Something went wrong")}
								</div>
							)}
						</div>

						<form
							onSubmit={(e) => {
								console.log("Form submit triggered, input:", input);
								console.log("Messages before submit:", messages);
								handleSubmit(e);
							}}
							className="flex gap-2"
						>
							<Input
								value={input}
								onChange={handleInputChange}
								placeholder="Ask something..."
							/>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? "Loading..." : "Send"}
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Chats</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{history.length === 0 && (
							<div className="text-sm text-muted-foreground">No chats yet</div>
						)}
						{history.map((c) => (
							<div key={c.id} className="text-sm truncate">
								{c.title || c.id}
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}


