import { disconnectGoogle } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	await disconnectGoogle();
	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
