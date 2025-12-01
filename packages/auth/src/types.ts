export interface User {
  id: string;
  email: string;
  user_metadata?: {
    brand_id?: string;
    full_name?: string;
  };
}

export interface BrandUser {
  id: string;
  user_id: string;
  brand_id: string;
  role: "company_admin" | "owner" | "creator" | "reviewer" | "user";
  created_at: string;
}

export type BrandRole = "company_admin" | "owner" | "creator" | "reviewer" | "user";

