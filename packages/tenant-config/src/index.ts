export type BrandId = "act" | "globex";

/**
 * Static brand configuration (hardcoded per-brand settings)
 */
export interface BrandConfig {
  id: BrandId;
  name: string;
  displayName: string;
  primaryColor: string;
  logoPath?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Dynamic brand guidelines (loaded from database)
 * These are AI-extracted and user-approved per brand.
 */
export interface BrandGuidelinesConfig {
  brandId: BrandId;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  voice: {
    personality: string[];
    tone: string;
    writeAs: string;
    audienceLevel: string;
  };
  copyGuidelines: {
    dos: Array<{ rule: string; example?: string; why?: string }>;
    donts: Array<{ rule: string; badExample: string; goodExample: string }>;
    wordChoices: Array<{ avoid: string; prefer: string }>;
    phrases: {
      required: string[];
      banned: string[];
    };
  };
  visualGuidelines: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      neutrals: string[];
      usage: string;
    };
    typography: {
      headings: { family: string; weights: string[] };
      body: { family: string; weights: string[] };
      usage: string;
    };
    imagery: {
      style: string;
      avoid: string[];
      prefer: string[];
    };
    logo: {
      clearSpace: string;
      minSize: string;
      donts: string[];
    };
  };
  messaging: {
    pillars: string[];
    valueProposition: string;
    tagline: string;
    boilerplate: string;
  };
}

const brands: Record<BrandId, BrandConfig> = {
  act: {
    id: "act",
    name: "act",
    displayName: "ACT",
    primaryColor: "#2563eb",
    logoPath: "/brands/act/logo.svg",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  globex: {
    id: "globex",
    name: "globex",
    displayName: "Globex Corp",
    primaryColor: "#7c3aed",
    logoPath: "/brands/globex/logo.svg",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
};

export function getBrandConfig(brandId: BrandId): BrandConfig {
  return brands[brandId];
}

export function getAllBrands(): BrandConfig[] {
  return Object.values(brands);
}

export { brands };

