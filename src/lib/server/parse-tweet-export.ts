import type { ArchivedTweet, TweetExportFooter } from './tweet-archive';

function parseStatNumber(s: string): number {
	const t = s.replace(/,/g, '').trim();
	const m = /^([\d.]+)([KMB])?$/i.exec(t);
	if (!m) return Math.round(parseFloat(t)) || 0;
	let n = parseFloat(m[1]);
	const u = m[2]?.toUpperCase();
	if (u === 'K') n *= 1000;
	else if (u === 'M') n *= 1_000_000;
	else if (u === 'B') n *= 1_000_000_000;
	return Math.round(n);
}

function parseStatsLine(line: string): Pick<
	ArchivedTweet,
	'replyCount' | 'retweetCount' | 'likeCount' | 'viewCount' | 'bookmarkCount' | 'statsRaw'
> {
	const statsRaw = line.replace(/^Stats:\s*/i, '').trim();
	const s = statsRaw;

	const grab = (pattern: RegExp): number => {
		const m = pattern.exec(s);
		return m ? parseStatNumber(m[1]) : 0;
	};

	return {
		statsRaw,
		replyCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+replies?/i),
		retweetCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+reposts?/i),
		likeCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+likes?/i),
		bookmarkCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+bookmarks?/i),
		viewCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+views?/i)
	};
}

function extractHashtags(text: string): string[] {
	const set = new Set<string>();
	for (const m of text.matchAll(/#(\w+)/g)) {
		set.add(m[1]);
	}
	return [...set];
}

function extractMentions(text: string): string[] {
	const set = new Set<string>();
	for (const m of text.matchAll(/@(\w+)/g)) {
		set.add(m[1]);
	}
	return [...set];
}

function parseDateLine(line: string): { dateRaw: string; pinned: boolean; createdAt: string } {
	const raw = line.replace(/^Date:\s*/, '').trim();
	const pinned = /Pinned Tweet/i.test(raw);
	const cleaned = raw.replace(/\s*\(Pinned Tweet\)\s*/i, '').trim();
	const d = new Date(cleaned);
	const createdAt = Number.isNaN(d.getTime()) ? cleaned : d.toISOString();
	return { dateRaw: raw, pinned, createdAt };
}

function parseFooterSection(lines: string[]): TweetExportFooter | undefined {
	const footer: TweetExportFooter = {};
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();
		if (!trimmed || /^={3,}/.test(trimmed)) {
			i++;
			continue;
		}
		if (/^Note:/i.test(trimmed)) {
			i++;
			continue;
		}
		if (/^Profile:/i.test(trimmed)) {
			footer.profileLine = trimmed.replace(/^Profile:\s*/i, '').trim();
			i++;
			continue;
		}
		if (/^Description:/i.test(trimmed)) {
			let desc = trimmed.replace(/^Description:\s*/i, '').trim();
			i++;
			while (
				i < lines.length &&
				!/^(Location|Joined|Followers|Following|Profile|={3}|Note:)/i.test(lines[i].trim())
			) {
				const t = lines[i].trim();
				if (/^={3,}/.test(t)) break;
				desc += (desc ? ' ' : '') + t;
				i++;
			}
			footer.description = desc;
			continue;
		}
		if (/^Location:/i.test(trimmed)) {
			footer.location = trimmed.replace(/^Location:\s*/i, '').trim();
			i++;
			continue;
		}
		if (/^Joined:/i.test(trimmed)) {
			footer.joined = trimmed.replace(/^Joined:\s*/i, '').trim();
			i++;
			continue;
		}
		if (/^Followers:/i.test(trimmed)) {
			footer.followers = trimmed.replace(/^Followers:\s*/i, '').trim();
			i++;
			continue;
		}
		if (/^Following:/i.test(trimmed)) {
			footer.following = trimmed.replace(/^Following:\s*/i, '').trim();
			i++;
			continue;
		}
		i++;
	}
	return Object.keys(footer).length > 0 ? footer : undefined;
}

function parseBillGatesDateLine(line: string): { dateRaw: string; pinned: boolean; createdAt: string } {
	const raw = line.replace(/^Date:\s*/, '').trim();
	const pinned = /Pinned Tweet/i.test(raw);
	const cleaned = raw
		.replace(/\s*\(Pinned Tweet\)\s*/i, '')
		.replace(/\s*\(Quote\)\s*/i, '')
		.trim();
	const d = new Date(cleaned);
	const createdAt = Number.isNaN(d.getTime()) ? cleaned : d.toISOString();
	return { dateRaw: raw, pinned, createdAt };
}

function parseEngagementLine(line: string): Pick<
	ArchivedTweet,
	'replyCount' | 'retweetCount' | 'likeCount' | 'viewCount' | 'bookmarkCount' | 'statsRaw'
> {
	const statsRaw = line.replace(/^Engagement:\s*/i, '').trim();
	const s = statsRaw;
	const grab = (pattern: RegExp): number => {
		const m = pattern.exec(s);
		return m ? parseStatNumber(m[1]) : 0;
	};
	return {
		statsRaw,
		replyCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+replies?/i),
		retweetCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+reposts?/i),
		likeCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+likes?/i),
		bookmarkCount: 0,
		viewCount: grab(/([\d,]+(?:\.\d+)?[KMB]?)\s+views?/i)
	};
}

/**
 * Nitter-style export: `TWEET N`, optional `Date:`, `@Handle:` body, optional `Link:` / `Quote from`, `Engagement:`.
 */
export function parseBillGatesTweetExportFile(text: string): {
	tweets: ArchivedTweet[];
	footer?: TweetExportFooter;
} {
	const lines = text.split(/\r?\n/);
	const endIdx = lines.findIndex(
		(l) => /^END OF COLLECTION/i.test(l) || /^END OF COLLECTED TWEETS/i.test(l)
	);
	const bodyLines = endIdx >= 0 ? lines.slice(0, endIdx) : lines;
	const afterEnd = endIdx >= 0 ? lines.slice(endIdx + 1) : [];

	const tweets: ArchivedTweet[] = [];
	let i = 0;

	function skipSeparatorsAndBlank(): void {
		while (
			i < bodyLines.length &&
			(/^={3,}/.test(bodyLines[i].trim()) || bodyLines[i].trim() === '')
		) {
			i++;
		}
	}

	while (i < bodyLines.length) {
		const headerMatch = /^TWEET\s+#?(\d+)/i.exec(bodyLines[i].trim());
		if (!headerMatch) {
			i++;
			continue;
		}

		const tweetIndex = parseInt(headerMatch[1], 10);
		const kind = /\(Repost\)/i.test(bodyLines[i]) ? 'repost' : 'tweet';
		i++;
		skipSeparatorsAndBlank();

		let dateRaw = '';
		let pinned = false;
		let createdAt = '';

		if (i < bodyLines.length && /^Date:/i.test(bodyLines[i])) {
			const parsed = parseBillGatesDateLine(bodyLines[i]);
			dateRaw = parsed.dateRaw;
			pinned = parsed.pinned;
			createdAt = parsed.createdAt;
			i++;
		}
		skipSeparatorsAndBlank();

		if (i >= bodyLines.length) break;

		const first = bodyLines[i].trim();
		const handleMatch = /^(@\w+):\s*(.*)$/.exec(first);
		if (!handleMatch) {
			i++;
			continue;
		}

		let content = handleMatch[2] ?? '';
		i++;
		while (i < bodyLines.length) {
			const line = bodyLines[i];
			const t = line.trim();
			if (/^TWEET\s+#?\d+/i.test(t)) break;
			if (/^={10,}/.test(t)) break;
			if (/^Link:/i.test(t)) break;
			if (/^Engagement:/i.test(t)) break;
			if (/^Quote from\b/i.test(t)) break;
			content += '\n' + line;
			i++;
		}

		let link: string | undefined;
		while (i < bodyLines.length) {
			const t = bodyLines[i].trim();
			if (/^Link:/i.test(t)) {
				link = bodyLines[i].replace(/^Link:\s*/i, '').trim();
				i++;
				continue;
			}
			if (/^Quote from\b/i.test(t)) {
				content += '\n' + t;
				i++;
				continue;
			}
			break;
		}

		let stats: ReturnType<typeof parseEngagementLine> = {
			statsRaw: '',
			replyCount: 0,
			retweetCount: 0,
			likeCount: 0,
			viewCount: 0,
			bookmarkCount: 0
		};
		if (i < bodyLines.length && /^Engagement:/i.test(bodyLines[i])) {
			stats = parseEngagementLine(bodyLines[i]);
			i++;
		}

		const textBody = content.trim();
		tweets.push({
			tweetIndex,
			kind,
			pinned: pinned || undefined,
			dateRaw,
			createdAt,
			text: textBody,
			link,
			statsRaw: stats.statsRaw,
			replyCount: stats.replyCount,
			retweetCount: stats.retweetCount,
			likeCount: stats.likeCount,
			viewCount: stats.viewCount,
			bookmarkCount: stats.bookmarkCount || undefined,
			hashtags: extractHashtags(textBody),
			mentions: extractMentions(textBody)
		});
	}

	const footer = parseFooterSection(afterEnd);
	return { tweets, footer };
}

/**
 * Parses the custom X export format (blocks starting with `TWEET #N`, Date / Content / optional Link / Stats).
 */
export function parseTweetExportFile(text: string): {
	tweets: ArchivedTweet[];
	footer?: TweetExportFooter;
} {
	const lines = text.split(/\r?\n/);
	const endIdx = lines.findIndex((l) => /^END OF COLLECTED TWEETS/i.test(l));
	const bodyLines = endIdx >= 0 ? lines.slice(0, endIdx) : lines;
	const afterEnd = endIdx >= 0 ? lines.slice(endIdx + 1) : [];

	const tweets: ArchivedTweet[] = [];
	let i = 0;

	while (i < bodyLines.length) {
		const headerMatch = /^TWEET #(\d+)/.exec(bodyLines[i]);
		if (!headerMatch) {
			i++;
			continue;
		}

		const tweetIndex = parseInt(headerMatch[1], 10);
		const kind = /\(Repost\)/i.test(bodyLines[i]) ? 'repost' : 'tweet';
		i++;

		while (i < bodyLines.length && !/^Date:/.test(bodyLines[i])) i++;
		if (i >= bodyLines.length) break;

		const { dateRaw, pinned, createdAt } = parseDateLine(bodyLines[i]);
		i++;

		while (i < bodyLines.length && !/^Content:/.test(bodyLines[i])) i++;
		if (i >= bodyLines.length) break;

		let content = bodyLines[i].replace(/^Content:\s*/, '');
		i++;
		while (i < bodyLines.length && !/^(Link:|Stats:|={10,})/.test(bodyLines[i])) {
			content += '\n' + bodyLines[i];
			i++;
		}

		let link: string | undefined;
		if (i < bodyLines.length && /^Link:/.test(bodyLines[i])) {
			link = bodyLines[i].replace(/^Link:\s*/, '').trim();
			i++;
		}

		let stats: ReturnType<typeof parseStatsLine> = {
			statsRaw: '',
			replyCount: 0,
			retweetCount: 0,
			likeCount: 0,
			viewCount: 0,
			bookmarkCount: 0
		};
		if (i < bodyLines.length && /^Stats:/.test(bodyLines[i])) {
			stats = parseStatsLine(bodyLines[i]);
			i++;
		}

		const textBody = content.trim();
		tweets.push({
			tweetIndex,
			kind,
			pinned: pinned || undefined,
			dateRaw,
			createdAt,
			text: textBody,
			link,
			statsRaw: stats.statsRaw,
			replyCount: stats.replyCount,
			retweetCount: stats.retweetCount,
			likeCount: stats.likeCount,
			viewCount: stats.viewCount,
			bookmarkCount: stats.bookmarkCount || undefined,
			hashtags: extractHashtags(textBody),
			mentions: extractMentions(textBody)
		});
	}

	const footer = parseFooterSection(afterEnd);
	return { tweets, footer };
}
