import { apiPost, apiDelete } from './api';

export async function createStoreSale(shiftId: number, productId: number, quantity: number) {
	const res = await apiPost('/api/store-sales', { shiftId, productId, quantity });
	return res.json();
}

export async function deleteStoreSale(id: number, passcode: string) {
	const res = await apiDelete('/api/store-sales', { id, passcode });
	return res.json();
}
