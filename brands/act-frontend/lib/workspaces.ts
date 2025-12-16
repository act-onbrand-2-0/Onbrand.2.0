import { headers } from "next/headers";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getWorkspaceFromSubdomain() {
	const hdrs = await headers();
	const host = hdrs.get("host") || "";
	// Extract subdomain from host (strip port if present)
	const hostWithoutPort = host.split(":")[0] || host;
	let subdomain = hostWithoutPort.split(".")[0] || "";

	// Fallback for localhost development: default to 'act' (or env override)
	if (!subdomain || subdomain === "localhost" || subdomain === "127" || hostWithoutPort === "127.0.0.1") {
		subdomain = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_SUBDOMAIN || "act";
	}

	const supabase = await createServerSupabase();
	let { data, error } = await supabase
		.from("workspaces")
		.select("*")
		.eq("subdomain", subdomain)
		.single();

	// Fallback to admin client in case RLS prevents reading workspace by subdomain
	if (error || !data) {
		const admin = createAdminClient();
		const { data: adminData, error: adminErr } = await admin
			.from("workspaces")
			.select("*")
			.eq("subdomain", subdomain)
			.single();
		if (adminErr) {
			throw new Error(`Workspace lookup failed: ${adminErr.message}`);
		}
		data = adminData;
	}
	return data;
}


