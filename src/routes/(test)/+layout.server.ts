import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return { operator: null, shift: null };
};
