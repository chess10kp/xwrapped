import type { Binary } from 'mongodb';

/** One image file tied to a handle (e.g. steipete / billgates). Stored in `archive_media`. */
export interface ArchiveMediaDocument {
	_id: string;
	handle: string;
	filename: string;
	contentType: string;
	size: number;
	data: Binary;
	importedAt: Date;
}
