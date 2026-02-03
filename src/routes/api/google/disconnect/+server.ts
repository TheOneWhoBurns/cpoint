import { disconnectGoogle } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const operatorId = cookies.get('operatorId');
	if (!operatorId) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	await disconnectGoogle();
	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
