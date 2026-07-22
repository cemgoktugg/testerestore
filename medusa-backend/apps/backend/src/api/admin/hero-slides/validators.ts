import { z } from "zod";

const BADGE_ICONS = ["zap", "flame", "wrench", "award"] as const;

const heroSlidePayload = {
  badge: z.string().min(1),
  badge_icon: z.enum(BADGE_ICONS).optional().default("zap"),
  title_prefix: z.string().min(1),
  title_suffix: z.string().nullable().optional(),
  highlight: z.string().min(1),
  description: z.string().min(1),
  image_url: z.string().min(1),
  primary_cta_label: z.string().min(1),
  primary_cta_href: z.string().min(1),
  secondary_cta_label: z.string().nullable().optional(),
  secondary_cta_href: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
};

export const PostHeroSlideSchema = z.object(heroSlidePayload);

export const PatchHeroSlideSchema = z.object({
  badge: heroSlidePayload.badge.optional(),
  badge_icon: z.enum(BADGE_ICONS).optional(),
  title_prefix: heroSlidePayload.title_prefix.optional(),
  title_suffix: heroSlidePayload.title_suffix,
  highlight: heroSlidePayload.highlight.optional(),
  description: heroSlidePayload.description.optional(),
  image_url: heroSlidePayload.image_url.optional(),
  primary_cta_label: heroSlidePayload.primary_cta_label.optional(),
  primary_cta_href: heroSlidePayload.primary_cta_href.optional(),
  secondary_cta_label: heroSlidePayload.secondary_cta_label,
  secondary_cta_href: heroSlidePayload.secondary_cta_href,
  accent: heroSlidePayload.accent,
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type PostHeroSlideBody = z.infer<typeof PostHeroSlideSchema>;
export type PatchHeroSlideBody = z.infer<typeof PatchHeroSlideSchema>;
