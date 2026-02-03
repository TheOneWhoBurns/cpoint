<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import '@material/web/button/text-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import { themeStore, type Theme } from '$lib/stores/theme';

	let { children, data } = $props();

	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		try {
			const res = await fetch('/api/admin/logout', { method: 'POST' });
			if (res.ok) {
				goto(`${adminBase}/login`);
			} else {
				loggingOut = false;
			}
		} catch {
			loggingOut = false;
		}
	}

	let currentTheme = $state<Theme>('system');
	$effect(() => {
		return themeStore.subscribe((v) => (currentTheme = v));
	});

	function resolvedIsDark(theme: Theme): boolean {
		if (theme === 'system') {
			return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		return theme === 'dark';
	}

	const adminBase = $derived(data.adminBase ?? '/admin');
	const dashboardHref = $derived(adminBase || '/');

	const navItems = $derived([
		{ href: dashboardHref, label: 'Dashboard', icon: 'dashboard' },
		{ href: `${adminBase}/operators`, label: 'Operators', icon: 'badge' },
		{ href: `${adminBase}/equipment`, label: 'Equipment', icon: 'handyman' },
		{ href: `${adminBase}/rental-products`, label: 'Rental Products', icon: 'inventory_2' },
		{ href: `${adminBase}/store-products`, label: 'Store Products', icon: 'shopping_bag' },
		{ href: `${adminBase}/guides`, label: 'Guides', icon: 'hiking' },
		{ href: `${adminBase}/tour-agency`, label: 'Tour Agency', icon: 'tour' },
		{ href: `${adminBase}/inventory`, label: 'Inventory', icon: 'warehouse' },
		{ href: `${adminBase}/settings`, label: 'Settings', icon: 'settings' },
		{ href: `${adminBase}/closing-checklist`, label: 'Closing Checklist', icon: 'checklist' }
	]);

	const isLoginPage = $derived($page.url.pathname === `${adminBase}/login`);
	const onSubdomain = $derived(adminBase === '');

	function isActive(href: string, currentPath: string): boolean {
		if (href === dashboardHref) {
			return currentPath === dashboardHref;
		}
		return currentPath.startsWith(href);
	}
</script>

{#if isLoginPage}
	{@render children()}
{:else}
<div class="admin-layout">
	<!-- Sidebar Navigation -->
	<aside class="admin-sidebar">
		<div class="sidebar-header">
			<div class="logo">
				<span class="material-symbols-rounded filled">settings</span>
				<span class="logo-text md-title-medium">Admin Panel</span>
			</div>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={isActive(item.href, $page.url.pathname)}
					aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
				>
					<span class="material-symbols-rounded" class:filled={isActive(item.href, $page.url.pathname)}>{item.icon}</span>
					<span class="nav-label md-label-large">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			{#if data.admin}
				<div class="admin-info">
					<span class="material-symbols-rounded">shield_person</span>
					<span class="md-label-large">{data.admin.name}</span>
				</div>
				<button class="logout-link" onclick={handleLogout} disabled={loggingOut}>
					<span class="material-symbols-rounded">logout</span>
					<span class="md-label-large">{loggingOut ? 'Logging out...' : 'Logout'}</span>
				</button>
			{/if}
			{#if !onSubdomain}
				<a href="/" class="back-link">
					<span class="material-symbols-rounded">arrow_back</span>
					<span class="md-label-large">Back to App</span>
				</a>
			{/if}
		</div>
	</aside>

	<!-- Main Content -->
	<div class="admin-main">
		<!-- Top App Bar -->
		<header class="admin-topbar">
			<div class="topbar-title">
				<h1 class="md-title-large" style="flex: 1;">
					{#if $page.url.pathname === dashboardHref}
						Dashboard
					{:else if $page.url.pathname.includes('/operators')}
						Operators
					{:else if $page.url.pathname.includes('/equipment')}
						Equipment
					{:else if $page.url.pathname.includes('/rental-products')}
						Rental Products
					{:else if $page.url.pathname.includes('/store-products')}
						Store Products
					{:else if $page.url.pathname.includes('/guides')}
						Guides
					{:else if $page.url.pathname.includes('/tour-agency')}
						Tour Agency
					{:else if $page.url.pathname.includes('/inventory')}
						Inventory
					{:else if $page.url.pathname.includes('/settings')}
						Settings
					{:else if $page.url.pathname.includes('/closing-checklist')}
						Closing Checklist
					{/if}
				</h1>
				<md-icon-button onclick={() => themeStore.toggle()} aria-label="Toggle dark mode">
					<span class="material-symbols-rounded">{resolvedIsDark(currentTheme) ? 'light_mode' : 'dark_mode'}</span>
				</md-icon-button>
			</div>
		</header>

		<!-- Page Content -->
		<main class="admin-content">
			{@render children()}
		</main>
	</div>

	<!-- Mobile Bottom Navigation -->
	<nav class="admin-bottomnav" aria-label="Admin navigation">
		{#each navItems as item}
			<a
				href={item.href}
				class="bottomnav-item"
				class:active={isActive(item.href, $page.url.pathname)}
				aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
				aria-label={item.label}
			>
				<span class="material-symbols-rounded" class:filled={isActive(item.href, $page.url.pathname)}>{item.icon}</span>
				<span class="bottomnav-label md-label-small">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
{/if}

<style>
	.admin-layout {
		display: flex;
		height: 100vh;
		background: var(--md-sys-color-background);
	}

	/* Sidebar */
	.admin-sidebar {
		width: 280px;
		display: flex;
		flex-direction: column;
		background: var(--md-sys-color-surface-container);
		border-right: 1px solid var(--md-sys-color-outline-variant);
	}

	.sidebar-header {
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		color: var(--md-sys-color-on-surface);
	}

	.logo .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-primary);
	}

	.logo-text {
		font-weight: 500;
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-sm);
		overflow-y: auto;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
		text-decoration: none;
		border-radius: var(--md-sys-shape-corner-full);
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.nav-item:hover {
		background: var(--md-sys-color-surface-container-high);
		color: var(--md-sys-color-on-surface);
	}

	.nav-item.active {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
	}

	.nav-item .material-symbols-rounded {
		font-size: 24px;
	}

	.nav-label {
		flex: 1;
	}

	/* Sidebar Footer */
	.sidebar-footer {
		padding: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-primary);
		text-decoration: none;
		border-radius: var(--md-sys-shape-corner-full);
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.back-link:hover {
		background: var(--md-sys-color-primary-container);
	}

	.admin-info {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
	}

	.admin-info .material-symbols-rounded {
		font-size: 20px;
		color: var(--md-sys-color-primary);
	}

	.logout-link {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-error);
		background: none;
		border: none;
		border-radius: var(--md-sys-shape-corner-full);
		cursor: pointer;
		width: 100%;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.logout-link:hover {
		background: var(--md-sys-color-error-container);
	}

	.logout-link:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Main Content Area */
	.admin-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	/* Top Bar */
	.admin-topbar {
		display: flex;
		align-items: center;
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		min-height: 64px;
	}

	.topbar-title {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.topbar-title h1 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	/* Page Content */
	.admin-content {
		flex: 1;
		padding: var(--md-sys-spacing-lg);
		overflow-y: auto;
		background: var(--md-sys-color-surface-container-lowest);
	}

	/* Responsive - Tablet */
	@media (max-width: 1024px) {
		.admin-sidebar {
			width: 240px;
		}
	}

	/* Mobile Bottom Navigation */
	.admin-bottomnav {
		display: none;
	}

	/* Responsive - Mobile (show bottom nav instead) */
	@media (max-width: 768px) {
		.admin-layout {
			flex-direction: column;
		}

		.admin-sidebar {
			display: none;
		}

		.admin-topbar {
			position: sticky;
			top: 0;
			z-index: 10;
		}

		.admin-content {
			padding: var(--md-sys-spacing-md);
			padding-bottom: calc(var(--md-sys-spacing-md) + 72px);
		}

		.admin-bottomnav {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: var(--md-sys-color-surface-container);
			border-top: 1px solid var(--md-sys-color-outline-variant);
			padding: var(--md-sys-spacing-xs) 0;
			padding-bottom: max(var(--md-sys-spacing-xs), env(safe-area-inset-bottom));
			z-index: 100;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}

		.admin-bottomnav::-webkit-scrollbar {
			display: none;
		}

		.bottomnav-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--md-sys-spacing-xs);
			padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
			color: var(--md-sys-color-on-surface-variant);
			text-decoration: none;
			border-radius: var(--md-sys-shape-corner-medium);
			min-width: 56px;
			flex-shrink: 0;
			transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
		}

		.bottomnav-item:hover {
			background: var(--md-sys-color-surface-container-high);
		}

		.bottomnav-item.active {
			color: var(--md-sys-color-primary);
		}

		.bottomnav-item .material-symbols-rounded {
			font-size: 24px;
		}

		.bottomnav-label {
			font-size: 10px;
		}
	}
</style>
