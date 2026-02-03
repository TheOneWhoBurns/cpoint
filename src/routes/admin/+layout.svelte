<script lang="ts">
	import { page } from '$app/stores';
	import '@material/web/button/text-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/admin/operators', label: 'Operators', icon: 'badge' },
		{ href: '/admin/equipment', label: 'Equipment', icon: 'handyman' },
		{ href: '/admin/rental-products', label: 'Rental Products', icon: 'inventory_2' },
		{ href: '/admin/store-products', label: 'Store Products', icon: 'shopping_bag' },
		{ href: '/admin/guides', label: 'Guides', icon: 'hiking' },
		{ href: '/admin/tour-agency', label: 'Tour Agency', icon: 'tour' },
		{ href: '/admin/inventory', label: 'Inventory', icon: 'warehouse' }
	];

	function isActive(href: string, currentPath: string): boolean {
		if (href === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath.startsWith(href);
	}
</script>

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
			<a href="/" class="back-link">
				<span class="material-symbols-rounded">arrow_back</span>
				<span class="md-label-large">Back to App</span>
			</a>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="admin-main">
		<!-- Top App Bar -->
		<header class="admin-topbar">
			<div class="topbar-title">
				<h1 class="md-title-large">
					{#if $page.url.pathname === '/admin'}
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
					{/if}
				</h1>
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
			justify-content: space-around;
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
