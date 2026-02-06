import { writable } from 'svelte/store';

interface ToastState {
	message: string;
	variant: 'success' | 'error' | 'warning' | 'info';
	visible: boolean;
}

function createToastStore() {
	const { subscribe, set } = writable<ToastState>({
		message: '',
		variant: 'success',
		visible: false
	});

	return {
		subscribe,
		success: (message: string) => set({ message, variant: 'success', visible: true }),
		error: (message: string) => set({ message, variant: 'error', visible: true }),
		warning: (message: string) => set({ message, variant: 'warning', visible: true }),
		dismiss: () => set({ message: '', variant: 'success', visible: false })
	};
}

export const toastStore = createToastStore();
