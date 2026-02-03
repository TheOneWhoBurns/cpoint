import { writable } from 'svelte/store';
import type { Operator, Shift } from '$lib/server/db/schema';

type SafeOperator = Omit<Operator, 'passcode'>;

interface ShiftState {
	operator: SafeOperator | null;
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
		setSession: (operator: SafeOperator, shift: Shift) => {
			set({ operator, shift, isLoggedIn: true });
		},
		clearSession: () => {
			set({ operator: null, shift: null, isLoggedIn: false });
		},
		login: async (operator: SafeOperator, shift: Shift) => {
			set({ operator, shift, isLoggedIn: true });
		},
		logout: async () => {
			await fetch('/api/shifts/logout', { method: 'POST' });
			set({ operator: null, shift: null, isLoggedIn: false });
		},
		updateShift: (shift: Shift) => {
			update(state => ({ ...state, shift }));
		}
	};
}

export const shiftStore = createShiftStore();
