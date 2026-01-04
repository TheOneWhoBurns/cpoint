import { writable } from 'svelte/store';
import type { Operator, Shift } from '$lib/server/db/schema';

interface ShiftState {
	operator: Operator | null;
	shift: Shift | null;
	isLoggedIn: boolean;
}

function createShiftStore() {
	const { subscribe, set, update } = writable<ShiftState>({
		operator: null,
		shift: null,
		isLoggedIn: false
	});

	return {
		subscribe,
		login: (operator: Operator, shift: Shift) => {
			set({ operator, shift, isLoggedIn: true });
		},
		logout: () => {
			set({ operator: null, shift: null, isLoggedIn: false });
		},
		updateShift: (shift: Shift) => {
			update(state => ({ ...state, shift }));
		}
	};
}

export const shiftStore = createShiftStore();
