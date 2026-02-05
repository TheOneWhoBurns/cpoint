<script lang="ts">
	type Tab = {
		id: string;
		label: string;
		icon: string;
		count?: number;
		alwaysShow?: boolean;
	};

	let {
		tabs,
		activeTab = $bindable('active')
	}: {
		tabs: Tab[];
		activeTab: string;
	} = $props();

	const visibleTabs = $derived(tabs.filter(t => t.alwaysShow || (t.count && t.count > 0)));
</script>

<nav class="tab-strip" role="tablist">
	{#each visibleTabs as tab}
		<button
			class="tab"
			class:active={activeTab === tab.id}
			role="tab"
			aria-selected={activeTab === tab.id}
			onclick={() => activeTab = tab.id}
		>
			<span class="material-symbols-rounded tab-icon">{tab.icon}</span>
			<span class="tab-label md-label-large">{tab.label}</span>
			{#if tab.count !== undefined && tab.count > 0}
				<span class="tab-badge md-label-small">{tab.count}</span>
			{/if}
			{#if activeTab === tab.id}
				<div class="tab-indicator"></div>
			{/if}
		</button>
	{/each}
</nav>

<style>
	.tab-strip {
		display: flex;
		gap: 0;
		background: var(--md-sys-color-surface);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		padding: 0 var(--md-sys-spacing-lg);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.tab-strip::-webkit-scrollbar { display: none; }

	.tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		min-height: 48px;
		min-width: 44px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--md-sys-color-on-surface-variant);
		transition: color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.tab:hover {
		color: var(--md-sys-color-on-surface);
		background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
	}

	.tab:focus-visible {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: -2px;
		border-radius: var(--md-sys-shape-corner-small);
	}

	.tab.active {
		color: var(--md-sys-color-primary);
	}

	.tab-icon { font-size: 20px; }

	.tab-label { font: var(--md-sys-typescale-label-large); }

	.tab-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 var(--md-sys-spacing-xs);
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-small);
	}

	.tab.active .tab-badge {
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
	}

	.tab-indicator {
		position: absolute;
		bottom: 0;
		left: var(--md-sys-spacing-md);
		right: var(--md-sys-spacing-md);
		height: 3px;
		background: var(--md-sys-color-primary);
		border-radius: 3px 3px 0 0;
	}

	@media (max-width: 600px) {
		.tab-strip { padding: 0 var(--md-sys-spacing-sm); }
		.tab { padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md); }
	}
</style>
