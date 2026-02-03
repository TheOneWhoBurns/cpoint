import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
	if (browser && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return 'dark';
	}
	return 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
	return theme === 'system' ? getSystemTheme() : theme;
}

function createThemeStore() {
	const stored = browser ? (localStorage.getItem('theme') as Theme | null) : null;
	const initial: Theme = stored ?? 'system';
	const { subscribe, set } = writable<Theme>(initial);

	function applyTheme(theme: Theme) {
		if (!browser) return;
		const resolved = resolveTheme(theme);
		document.documentElement.setAttribute('data-theme', resolved);
		document.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', resolved === 'dark' ? '#191C1C' : '#006A6A');
	}

	// Apply on init
	applyTheme(initial);

	// Listen for OS theme changes when in system mode
	if (browser) {
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			const current = localStorage.getItem('theme') as Theme | null ?? 'system';
			if (current === 'system') {
				applyTheme('system');
			}
		});
	}

	return {
		subscribe,
		set(theme: Theme) {
			if (browser) {
				localStorage.setItem('theme', theme);
			}
			applyTheme(theme);
			set(theme);
		},
		toggle() {
			let current: Theme = 'system';
			subscribe((v) => (current = v))();
			const resolved = resolveTheme(current);
			const next: Theme = resolved === 'light' ? 'dark' : 'light';
			this.set(next);
		}
	};
}

export const themeStore = createThemeStore();
