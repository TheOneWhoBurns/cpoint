import { isGoogleConnected } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const connected = await isGoogleConnected();
	return new Response(JSON.stringify({ connected }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
