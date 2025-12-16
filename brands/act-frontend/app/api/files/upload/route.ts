import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const supabase = createServerSupabase();
	const { data: authData, error: authError } = await supabase.auth.getUser();
	if (authError || !authData?.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const chatId = req.nextUrl.searchParams.get("chatId") || "";
	if (!chatId) {
		return new Response("Missing chatId", { status: 400 });
	}

	const formData = await req.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		return new Response("No file uploaded", { status: 400 });
	}

	const fileExt = file.name.split(".").pop() || "dat";
	const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
	const objectKey = `${chatId}/${fileName}`;

	// Upload to Supabase Storage
	const arrayBuffer = await file.arrayBuffer();
	const { error: uploadError } = await supabase.storage
		.from("chat-attachments")
		.upload(objectKey, new Uint8Array(arrayBuffer), {
			contentType: file.type || "application/octet-stream",
			upsert: false,
		});
	if (uploadError) {
		return new Response(`Upload failed: ${uploadError.message}`, { status: 500 });
	}

	// Public URL
	const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(objectKey);
	const url = pub?.publicUrl || "";

	// Save document reference
	await supabase.from("documents").insert({
		chat_id: chatId,
		title: file.name,
		kind: file.type || "application/octet-stream",
		url,
	});

	return Response.json({ url, key: objectKey });
}


