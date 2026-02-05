interface Item {
	type: string;
	itemId?: number;
	categoryId?: number;
	quantity?: number;
}

export function computeTrackedItemChanges(oldItems: Item[], newItems: Item[]): { toRelease: number[]; toClaim: number[] } {
	const oldIds = new Set(oldItems.filter(i => i.type === 'tracked' && i.itemId).map(i => i.itemId!));
	const newIds = new Set(newItems.filter(i => i.type === 'tracked' && i.itemId).map(i => i.itemId!));

	const toRelease = [...oldIds].filter(id => !newIds.has(id));
	const toClaim = [...newIds].filter(id => !oldIds.has(id));

	return { toRelease, toClaim };
}

export function computeGenericDelta(oldItems: Item[], newItems: Item[]): Map<number, number> {
	const oldMap = new Map<number, number>();
	for (const item of oldItems) {
		if (item.type === 'generic' && item.categoryId) {
			oldMap.set(item.categoryId, (oldMap.get(item.categoryId) || 0) + (item.quantity || 1));
		}
	}

	const newMap = new Map<number, number>();
	for (const item of newItems) {
		if (item.type === 'generic' && item.categoryId) {
			newMap.set(item.categoryId, (newMap.get(item.categoryId) || 0) + (item.quantity || 1));
		}
	}

	const result = new Map<number, number>();
	const allCategoryIds = new Set([...oldMap.keys(), ...newMap.keys()]);

	for (const catId of allCategoryIds) {
		const oldQty = oldMap.get(catId) || 0;
		const newQty = newMap.get(catId) || 0;
		const diff = newQty - oldQty;
		if (diff !== 0) {
			result.set(catId, diff);
		}
	}

	return result;
}
