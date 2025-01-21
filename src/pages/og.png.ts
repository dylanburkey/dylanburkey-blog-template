import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@utils/generateOgImages";

/**
 * Handles the GET request to generate an Open Graph (OG) image for the site.
 *
 * @returns {Promise<Response>} A promise that resolves to a Response object containing the generated OG image.
 *
 * @remarks
 * The response includes headers specifying the content type as either "image/webp", "image/png", or "image/jpeg".
 */

export const GET: APIRoute = async () =>
  new Response(await generateOgImageForSite(), {
    headers: {
      "Content-Type": "image/webp, image/png, image/jpeg",
    },
  });
