<script lang="ts">
	import { formatCount, matchTweetForBestText } from '$lib/tweet-stats';
	import type { WrappedResult } from '$lib/server/types';

	let { result, embedded = false }: { result: WrappedResult; embedded?: boolean } = $props();

	const matchedBestTweet = $derived(
		matchTweetForBestText(result.tweets, result.analysis?.best_tweet)
	);

	function tweetCardDate(d: Date | string | undefined): string {
		const date = d ? new Date(d) : new Date();
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function tweetCardDateIso(d: Date | string | undefined): string | undefined {
		const date = d ? new Date(d) : new Date();
		if (Number.isNaN(date.getTime())) return undefined;
		return date.toISOString();
	}

	const analysis = $derived(result.analysis);
</script>

{#if analysis?.best_tweet}
	<article
		class="bg-black transition-colors hover:bg-[#080808] {embedded
			? 'border-0'
			: 'border border-[#2f3336]'}"
		aria-label="Highlighted post"
	>
		<div class="px-4 pb-3 pt-3">
			<div class="min-w-0">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 text-[16px] leading-5">
						<div class="flex flex-wrap items-center gap-x-1">
							<span class="truncate font-bold text-[#e7e9ea]">
								{result.profile?.name?.trim() || result.handle}
							</span>
							{#if result.profile?.isBlueVerified}
								<span
									class="inline-flex shrink-0 text-[#1d9bf0]"
									title="Verified account"
									aria-label="Verified account"
								>
									<svg class="h-[1.1em] w-[1.1em]" viewBox="0 0 22 22" aria-hidden="true">
										<path
											fill="currentColor"
											d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646-.017-1.273.212-1.813.568s-.972.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14s-1.21.436-1.68.883c-.445.47-.749 1.055-.878 1.688-.13.633-.082 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.816.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.226.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.568s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.896.445-.47.749-1.055.878-1.688.13-.633.083-1.29-.141-1.895.587-.274 1.088-.705 1.444-1.246.356-.54.555-1.17.574-1.816zM9.662 14.85l-3.429-3.428 1.293-1.292 2.072 2.072 4.26-4.26 1.293 1.286-5.489 5.622z"
										/>
									</svg>
								</span>
							{/if}
						</div>
						<p class="truncate text-[16px] text-[#71767b]">
							@{result.handle}
							{#if tweetCardDate(matchedBestTweet?.createdAt ?? result.createdAt) && tweetCardDateIso(matchedBestTweet?.createdAt ?? result.createdAt)}
								<span class="select-none"> · </span>
								<time datetime={tweetCardDateIso(matchedBestTweet?.createdAt ?? result.createdAt)}>
									{tweetCardDate(matchedBestTweet?.createdAt ?? result.createdAt)}
								</time>
							{/if}
						</p>
					</div>

					<button
						type="button"
						class="-mr-1 rounded-full p-1.5 text-[#71767b] transition-colors hover:bg-[#181919] hover:text-[#1d9bf0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0]"
						aria-label="More"
					>
						<svg class="h-[1.15em] w-[1.15em]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path
								d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
							/>
						</svg>
					</button>
				</div>

				<div class="mt-0.5 whitespace-pre-wrap break-words text-[16px] leading-[1.4] text-[#e7e9ea]">
					{analysis.best_tweet}
				</div>

				<div
					class="mt-3 flex max-w-md flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[14px] text-[#71767b] [-webkit-tap-highlight-color:transparent] sm:max-w-[425px]"
				>
					<button
						type="button"
						class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#1d9bf0]"
						aria-label="Replies"
					>
						<span
							class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#1d9bf0]/10"
						>
							<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
								<path
									d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.006-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.59-.88 2.571-2.55 2.571-4.48 0-2.9-2.35-5.25-5.25-5.25H9.75z"
									fill="currentColor"
								/>
							</svg>
						</span>
						<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.replyCount) : '—'}</span>
					</button>

					<button
						type="button"
						class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#00ba7c]"
						aria-label="Reposts"
					>
						<span
							class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#00ba7c]/10"
						>
							<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M4.75 3.79l4.503 4.75-1.526 1.453L6 7.234V16.5h2V20H2v-3.5h2V6.234L1.25 9.992.22 8.72 4.75 3.79zm14.5 0l4.53 4.932-1.03 1.272-1.75-1.758V16.5h2V20h-6v-3.5h2V7.234l-1.727 1.758-1.527-1.453 4.503-4.75z"
									fill="currentColor"
								/>
							</svg>
						</span>
						<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.retweetCount) : '—'}</span>
					</button>

					<button
						type="button"
						class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#f91880]"
						aria-label="Likes"
					>
						<span
							class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#f91880]/10"
						>
							<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16-.75-1.04-1.713-1.7-2.89-1.7-1.861 0-3.371 1.507-3.371 3.366 0 3.225 3.41 6.432 6.087 8.55.192.154.437.237.683.237.245 0 .49-.083.683-.237 2.677-2.118 6.087-5.325 6.087-8.55C20 7.01 18.542 5.5 16.697 5.5zm-1.619 10.909c-.787-.74-1.509-1.477-2.164-2.206-.655.729-1.377 1.465-2.164 2.206C10.627 16.061 7 12.855 7 9.766 7 8.34 8.114 7.25 9.679 7.25c.965 0 1.809.586 2.31 1.432l.679 1.19.679-1.19c.5-.846 1.345-1.432 2.31-1.432C17.886 7.25 19 8.34 19 9.766c0 3.089-3.627 6.295-5.922 8.643z"
									fill="currentColor"
								/>
							</svg>
						</span>
						<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.likeCount) : '—'}</span>
					</button>

					<button
						type="button"
						class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#1d9bf0]"
						aria-label="Views"
					>
						<span
							class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#1d9bf0]/10"
						>
							<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-4h2v4h-2z"
									fill="currentColor"
								/>
							</svg>
						</span>
						<span class="tabular-nums"
							>{matchedBestTweet && matchedBestTweet.viewCount > 0
								? formatCount(matchedBestTweet.viewCount)
								: matchedBestTweet
									? '0'
									: '—'}</span
						>
					</button>
				</div>

				<div class="mt-3 border-t border-[#2f3336] pt-3">
					<p class="text-[16px] leading-[1.4] text-[#71767b]">
						{analysis.best_tweet_why}
					</p>
				</div>
			</div>
		</div>
	</article>
{/if}
