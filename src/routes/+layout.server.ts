import type { LayoutServerLoad } from './$types';
import { base } from '$app/paths';

export const load: LayoutServerLoad = ({ route, url }) => {
	const homePath =
		base === ''
			? url.pathname === '/'
			: url.pathname === base || url.pathname === `${base}/`;
	const isHome = route.id === '/' || homePath;
	const isGenerationLoading = route.id === '/loading/[handle]';
	return { showRightRail: !isHome && !isGenerationLoading };
};
