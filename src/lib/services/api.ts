export interface ApiError {
	message: string;
	status: number;
	data?: any;
}

async function handleResponse(res: Response) {
	if (res.ok) return res;
	let body: any = {};
	try {
		body = await res.json();
	} catch {
		body = { message: res.statusText };
	}
	const err: ApiError = {
		message: body.error || body.message || res.statusText,
		status: res.status,
		data: body
	};
	throw err;
}

export async function apiPost(url: string, body: any) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return handleResponse(res);
}

export async function apiPatch(url: string, body: any) {
	const res = await fetch(url, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return handleResponse(res);
}

export async function apiDelete(url: string, body?: any) {
	const res = await fetch(url, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	return handleResponse(res);
}

export async function apiGet(url: string, params?: Record<string, string>) {
	const query = params ? '?' + new URLSearchParams(params).toString() : '';
	const res = await fetch(url + query);
	return handleResponse(res);
}
