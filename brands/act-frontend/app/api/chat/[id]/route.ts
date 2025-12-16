import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
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

	const chatId = params.id;
	const { error } = await supabase.from("chats").delete().eq("id", chatId);
	if (error) {
		return new Response(error.message, { status: 500 });
	}
	return new Response(null, { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

	const chatId = params.id;
	const body = await req.json().catch(() => ({}));
	const title = (body?.title as string) || "";
	if (!title) {
		return new Response("Title is required", { status: 400 });
	}
	const { error } = await supabase
		.from("chats")
		.update({ title, updated_at: new Date().toISOString() })
		.eq("id", chatId);
	if (error) {
		return new Response(error.message, { status: 500 });
	}
	return new Response(null, { status: 200 });
}


