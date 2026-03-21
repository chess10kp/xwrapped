import type { PersonalityAnalysis } from '$lib/server/types';

const ARCHETYPE_VOICE_MAP = {
	'the chaos agent': 'Jack Black',
	'the midnight ranter': 'Alan Rickman',
	'the deep thinker': 'Morgan Freeman',
	'the funny guy': 'Steve Carell'
} as const;

const DEFAULT_VOICE = 'Morgan Freeman';
const MAX_VOICEOVER_CHARS = 1000;

function normalizeLabel(value: string | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

function truncateForVoiceover(text: string): string {
	const trimmed = text.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= MAX_VOICEOVER_CHARS) return trimmed;
	const cut = trimmed.slice(0, MAX_VOICEOVER_CHARS - 1);
	const lastSentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
	if (lastSentence > MAX_VOICEOVER_CHARS * 0.6) {
		return cut.slice(0, lastSentence + 1).trim();
	}
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export function pickVoiceForAnalysis(analysis: PersonalityAnalysis | undefined): string {
	const archetype = normalizeLabel(analysis?.archetype);
	if (archetype && archetype in ARCHETYPE_VOICE_MAP) {
		return ARCHETYPE_VOICE_MAP[archetype as keyof typeof ARCHETYPE_VOICE_MAP];
	}

	const tone = normalizeLabel(analysis?.tone);
	if (/(chaotic|chaos|wild|energetic|unhinged)/.test(`${archetype} ${tone}`)) return 'Jack Black';
	if (/(midnight|ranter|deadpan|dry|sardonic)/.test(`${archetype} ${tone}`)) return 'Alan Rickman';
	if (/(deep|thinker|measured|authoritative|analytical|serious)/.test(`${archetype} ${tone}`)) {
		return 'Morgan Freeman';
	}
	if (/(funny|warm|punchy|playful|wholesome|goofy)/.test(`${archetype} ${tone}`)) return 'Steve Carell';

	return DEFAULT_VOICE;
}

export function buildVoiceoverScript(analysis: PersonalityAnalysis | undefined): string {
	if (!analysis) {
		return 'Here is your X Wrapped. The posts were noted. The timeline survived.';
	}

	const archetypeLead =
		analysis.archetype_description?.trim() || `Your archetype is ${analysis.archetype.trim()}.`;
	const vibe = analysis.vibe_summary?.trim() ?? '';

	return truncateForVoiceover([archetypeLead, vibe].filter(Boolean).join(' '));
}
