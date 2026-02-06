import { apiPost, apiPatch } from './api';

export async function createReservation(payload: any) {
	const res = await apiPost('/api/reservations', payload);
	return res.json();
}

export async function editReservation(id: number, data: any) {
	const res = await apiPatch('/api/reservations', {
		action: 'edit',
		id,
		...data
	});
	return res.json();
}

export async function cancelReservation(id: number, passcode: string) {
	const res = await apiPatch('/api/reservations', {
		action: 'cancel',
		id,
		passcode
	});
	return res.json();
}

export function mapReservationToPrefill(reservation: any, products: any[]) {
	const items = reservation.items as Array<{
		type: string;
		itemId?: number;
		categoryId?: number;
		code?: string;
		name: string;
		quantity?: number;
	}>;
	const customer = reservation.customer as {
		name?: string;
		hotel?: string;
		phone?: string;
	} | null;

	const trackedItems: Record<number, number[]> = {};
	const genericItems: Record<number, boolean> = {};

	for (const item of items) {
		if (item.type === 'tracked' && item.categoryId && item.itemId) {
			if (!trackedItems[item.categoryId]) trackedItems[item.categoryId] = [];
			trackedItems[item.categoryId].push(item.itemId);
		} else if (item.type === 'generic' && item.categoryId) {
			genericItems[item.categoryId] = true;
		}
	}

	const categoryIds = new Set(
		[...Object.keys(trackedItems), ...Object.keys(genericItems)].map(Number)
	);
	let matchedProductId: number | undefined;
	for (const product of products) {
		const equipment = product.equipment as Array<{ categoryId: number }> | null;
		if (equipment) {
			const productCategoryIds = new Set(equipment.map((e: any) => e.categoryId));
			if ([...categoryIds].every(id => productCategoryIds.has(id))) {
				matchedProductId = product.id;
				break;
			}
		}
	}

	return {
		productId: matchedProductId,
		customerName: customer?.name || '',
		customerHotel: customer?.hotel || '',
		customerPhone: customer?.phone || '',
		guideId: reservation.guideId || null,
		trackedItems,
		genericItems
	};
}
