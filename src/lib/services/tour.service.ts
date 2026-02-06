import { apiPost, apiPatch, apiDelete } from './api';

export async function createTourBooking(payload: any) {
	const res = await apiPost('/api/tour-bookings', payload);
	return res.json();
}

export async function editTourBooking(id: number, data: any) {
	const res = await apiPatch('/api/tour-bookings', {
		action: 'edit',
		id,
		...data
	});
	return res.json();
}

export async function closeTourBooking(id: number, cost: number) {
	const res = await apiPatch('/api/tour-bookings', {
		action: 'close',
		id,
		cost
	});
	return res.json();
}

export async function deleteTourBooking(id: number, passcode: string) {
	const res = await apiDelete('/api/tour-bookings', { id, passcode });
	return res.json();
}
