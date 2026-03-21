import Exa from 'exa-js';
import { EXA_API_KEY } from '$lib/server/env.server';
import type { ProfileData } from './types';

let client: Exa | null = null;

export function isExaConfigured(): boolean {
	return Boolean(EXA_API_KEY?.trim());
}

export function getExaClient(): Exa {
	if (client) return client;
	const key = EXA_API_KEY?.trim();
	if (!key) {
		throw new Error(
			'EXA_API_KEY is missing or empty. Add it to .env (see .env.example). https://dashboard.exa.ai/api-keys'
		);
	}
	client = new Exa(key);
	return client;
}

const MAX_CONTEXT_CHARS = 6000;

function buildPersonSearchQuery(profile: ProfileData): string {
	const bio = profile.bio.replace(/\s+/g, ' ').trim().slice(0, 160);
	const base = `${profile.name} @${profile.username} X Twitter`;
	return bio ? `${base}. ${bio}` : base;
}

function formatResultsForPrompt(
	results: Array<{
		title?: string | null;
		url: string;
		highlights?: string[];
	}>
): string {
	const lines: string[] = [];
	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		const title = r.title?.trim() || r.url;
		const hl = (r.highlights ?? []).filter(Boolean).join(' … ');
		lines.push(`### [${i + 1}] ${title}`);
		lines.push(`URL: ${r.url}`);
		if (hl) lines.push(hl);
		lines.push('');
	}
	let text = lines.join('\n').trim();
	if (text.length > MAX_CONTEXT_CHARS) {
		text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n… (truncated)`;
	}
	return text;
}

/**
 * Public-web context for this account (Exa neural search + highlights), for LLM grounding alongside tweet data.
 * Returns null if Exa is not configured or the request fails.
 */
export async function searchWebContextForPerson(profile: ProfileData): Promise<string | null> {
	if (!isExaConfigured()) return null;
	const query = buildPersonSearchQuery(profile);
	try {
		const res = await getExaClient().search(query, {
			type: 'auto',
			numResults: 6,
			contents: {
				highlights: {
					maxCharacters: 800
				}
			}
		});
		const formatted = formatResultsForPrompt(res.results);
		return formatted.length > 0 ? formatted : null;
	} catch (err) {
		console.error('[exa] searchWebContextForPerson failed', err);
		return null;
	}
}

export type SearchWebOptions = {
	/** Default 10 */
	numResults?: number;
	/** Exa category filter (e.g. news, tweet) */
	category?:
		| 'company'
		| 'research paper'
		| 'news'
		| 'pdf'
		| 'tweet'
		| 'personal site'
		| 'financial report'
		| 'people';
};

/**
 * Neural search with compact highlights (auto type, ~4k chars highlights per Exa quick-start).
 */
export async function searchWeb(query: string, options?: SearchWebOptions) {
	const { numResults = 10, category } = options ?? {};
	return getExaClient().search(query, {
		type: 'auto',
		numResults,
		...(category ? { category } : {}),
		contents: {
			highlights: {
				maxCharacters: 4000
			}
		}
	});
}

/**
 * Fetch page text for URLs you already have (e.g. RAG, citations).
 */
export async function getContentsForUrls(urls: string[], maxCharacters = 20_000) {
	return getExaClient().getContents(urls, {
		text: { maxCharacters }
	});
}
