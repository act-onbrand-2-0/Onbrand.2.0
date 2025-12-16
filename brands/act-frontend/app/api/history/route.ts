import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getWorkspaceFromSubdomain } from "@/lib/workspaces";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
	const cookieStore = await cookies();
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL || "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value;
				},
				set(name: string, value: string, options: any) {
					cookieStore.set({ name, value, ...options });
				},
				remove(name: string, options: any) {
					cookieStore.set({ name, value: "", ...options });
				},
			},
		}
	);
	const { data: authData, error: authError } = await supabase.auth.getUser();
	if (authError || !authData?.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const workspace = await getWorkspaceFromSubdomain();
		const { data, error } = await supabase
			.from("chats")
			.select("*")
			.eq("workspace_id", workspace.id)
			.order("updated_at", { ascending: false });
		// If RLS denies or user has no chats yet, return empty array rather than 400
		if (error) {
			return Response.json([]);
		}
		return Response.json(data ?? []);
	} catch (e: any) {
		// On workspace lookup failure, return empty to avoid breaking the page
		return Response.json([]);
	}
}


