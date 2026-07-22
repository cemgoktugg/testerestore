import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, MEDUSA_READY } from "../config";

export interface FooterFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface FooterLinkGroup {
  id: string;
  title: string;
  links: Array<{ label: string; href: string }>;
  sort_order: number;
  is_active: boolean;
}

export interface FooterSettings {
  id: string;
  company_description: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  copyright_text: string | null;
  legal_links: Array<{ label: string; href?: string }>;
}

export interface FooterPayload {
  features: FooterFeature[];
  link_groups: FooterLinkGroup[];
  settings: FooterSettings | null;
}

/** Public fetch — single call returns all footer data. */
export async function getFooter(): Promise<FooterPayload | null> {
  if (!MEDUSA_READY) return null;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/footer`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as FooterPayload;
  } catch (e) {
    console.error("[medusa] getFooter failed", e);
    return null;
  }
}
