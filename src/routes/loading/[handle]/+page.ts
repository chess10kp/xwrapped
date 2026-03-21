export interface PageData {
	handle: string;
}

export function load({ params }: { params: { handle: string } }): PageData {
	return {
		handle: params.handle.toLowerCase()
	};
}
