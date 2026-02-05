<script lang="ts">
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import { themeStore, type Theme } from '$lib/stores/theme';
	import { onMount, onDestroy } from 'svelte';

	let {
		operatorName,
		shiftStartedAt,
		error = '',
		loading = false,
		onEndShift,
		onDismissError
	}: {
		operatorName: string;
		shiftStartedAt: string;
		error?: string;
		loading?: boolean;
		onEndShift: () => void;
		onDismissError?: () => void;
	} = $props();

	let currentTheme = $state<Theme>('system');
	let shiftDuration = $state('');
	let interval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		return themeStore.subscribe((v) => (currentTheme = v));
	});

	function resolvedIsDark(theme: Theme): boolean {
		if (theme === 'system') {
			return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		return theme === 'dark';
	}

	function updateDuration() {
		if (!shiftStartedAt) return;
		const start = new Date(shiftStartedAt);
		const now = new Date();
		const diffMs = now.getTime() - start.getTime();
		const hours = Math.floor(diffMs / 3600000);
		const minutes = Math.floor((diffMs % 3600000) / 60000);
		shiftDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
	}

	onMount(() => {
		updateDuration();
		interval = setInterval(updateDuration, 60000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<header class="app-header">
	<div class="header-start">
		<span class="material-symbols-rounded header-icon">point_of_sale</span>
		<h1 class="md-headline-small">Rental Manager</h1>
	</div>

	<div class="header-center">
		<div class="shift-timer">
			<span class="material-symbols-rounded icon-sm">timer</span>
			<span class="md-label-large">{shiftDuration}</span>
		</div>
	</div>

	<div class="header-end">
		{#if error}
			<div class="header-error" role="alert">
				<span class="material-symbols-rounded">error</span>
				<span class="md-body-small">{error}</span>
				{#if onDismissError}
					<button class="dismiss-btn" onclick={onDismissError} aria-label="Dismiss error">
						<span class="material-symbols-rounded">close</span>
					</button>
				{/if}
			</div>
		{/if}
		<md-icon-button onclick={() => themeStore.toggle()} aria-label="Toggle dark mode">
			<span class="material-symbols-rounded">{resolvedIsDark(currentTheme) ? 'light_mode' : 'dark_mode'}</span>
		</md-icon-button>
		<div class="operator-badge">
			<span class="material-symbols-rounded">person</span>
			<span class="md-label-large">{operatorName}</span>
		</div>
		<md-outlined-button onclick={onEndShift} disabled={loading}>
			<span class="material-symbols-rounded" slot="icon">logout</span>
			End Shift
		</md-outlined-button>
	</div>
</header>

<style>
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		box-shadow: var(--md-sys-elevation-level1);
		position: sticky;
		top: 0;
		z-index: 10;
		overflow: visible;
	}

	.header-start {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		min-width: 0;
		flex-shrink: 1;
		overflow: hidden;
	}

	.header-icon {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.header-start h1 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-center {
		display: flex;
		align-items: center;
	}

	.shift-timer {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-md);
		height: 36px;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-large);
	}

	.header-end {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		flex-shrink: 0;
	}

	.header-error {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.header-error .material-symbols-rounded { font-size: 18px; }

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		padding: 2px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	.dismiss-btn .material-symbols-rounded { font-size: 16px; }

	.operator-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-md);
		height: 40px;
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.operator-badge .material-symbols-rounded { font-size: 20px; }

	.app-header md-outlined-button { flex-shrink: 0; white-space: nowrap; }

	.icon-sm { font-size: 18px; }

	@media (max-width: 768px) {
		.app-header {
			flex-wrap: wrap;
			gap: var(--md-sys-spacing-sm);
			padding: var(--md-sys-spacing-sm);
		}
		.header-center { order: 3; width: 100%; justify-content: center; }
		.header-end { width: 100%; justify-content: space-between; }
	}
</style>
