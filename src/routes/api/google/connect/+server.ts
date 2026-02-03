import { getAuthUrl } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const url = getAuthUrl();
	return new Response(null, {
		status: 302,
		headers: { Location: url }
	});
};
