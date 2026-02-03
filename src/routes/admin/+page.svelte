<script lang="ts">
	const quickLinks = [
		{
			href: '/admin/operators',
			icon: 'badge',
			title: 'Operators',
			description: 'Manage operator accounts and passcodes'
		},
		{
			href: '/admin/equipment',
			icon: 'handyman',
			title: 'Equipment',
			description: 'Add and organize equipment categories'
		},
		{
			href: '/admin/rental-products',
			icon: 'inventory_2',
			title: 'Rental Products',
			description: 'Configure rental bundles and pricing'
		},
		{
			href: '/admin/store-products',
			icon: 'shopping_bag',
			title: 'Store Products',
			description: 'Manage POS inventory and prices'
		},
		{
			href: '/admin/guides',
			icon: 'hiking',
			title: 'Guides',
			description: 'Set up guides and cooldown periods'
		},
		{
			href: '/admin/inventory',
			icon: 'warehouse',
			title: 'Inventory',
			description: 'View current stock and item status'
		},
		{
			href: '/admin/settings',
			icon: 'settings',
			title: 'Settings',
			description: 'Google Sheets integration and app configuration'
		}
	];
</script>

<div class="dashboard">
	<!-- Welcome Section -->
	<section class="welcome-section">
		<div class="welcome-content">
			<span class="material-symbols-rounded welcome-icon">waving_hand</span>
			<div>
				<h2 class="md-headline-small">Welcome to the Admin Panel</h2>
				<p class="md-body-medium">Manage your rental system configuration from here.</p>
			</div>
		</div>
	</section>

	<!-- Quick Links Grid -->
	<section class="quick-links-section">
		<h3 class="md-title-medium section-title">Quick Access</h3>
		<div class="quick-links-grid">
			{#each quickLinks as link}
				<a href={link.href} class="quick-link-card">
					<div class="card-icon">
						<span class="material-symbols-rounded">{link.icon}</span>
					</div>
					<div class="card-content">
						<h4 class="md-title-medium">{link.title}</h4>
						<p class="md-body-small">{link.description}</p>
					</div>
					<span class="material-symbols-rounded arrow-icon">arrow_forward</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- Tips Section -->
	<section class="tips-section">
		<div class="tip-card">
			<span class="material-symbols-rounded tip-icon">lightbulb</span>
			<div class="tip-content">
				<h4 class="md-title-small">Getting Started</h4>
				<p class="md-body-small">Start by adding operators, then set up your equipment categories and rental products. Finally, configure guides if your business uses them.</p>
			</div>
		</div>
	</section>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 1200px;
	}

	/* Welcome Section */
	.welcome-section {
		background: linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-tertiary-container) 100%);
		border-radius: var(--md-sys-shape-corner-large);
		padding: var(--md-sys-spacing-xl);
	}

	.welcome-content {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
	}

	.welcome-icon {
		font-size: 48px;
		color: var(--md-sys-color-on-primary-container);
	}

	.welcome-content h2 {
		margin: 0;
		color: var(--md-sys-color-on-primary-container);
	}

	.welcome-content p {
		margin: var(--md-sys-spacing-xs) 0 0;
		color: var(--md-sys-color-on-primary-container);
		opacity: 0.8;
	}

	/* Quick Links Section */
	.quick-links-section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.section-title {
		color: var(--md-sys-color-on-surface);
		margin: 0;
	}

	.quick-links-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.quick-link-card {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		text-decoration: none;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.quick-link-card:hover {
		background: var(--md-sys-color-surface-container);
		border-color: var(--md-sys-color-primary);
		box-shadow: var(--md-sys-elevation-level1);
		transform: translateY(-2px);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--md-sys-color-primary-container);
		border-radius: var(--md-sys-shape-corner-medium);
		flex-shrink: 0;
	}

	.card-icon .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-on-primary-container);
	}

	.card-content {
		flex: 1;
		min-width: 0;
	}

	.card-content h4 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.card-content p {
		margin: var(--md-sys-spacing-xs) 0 0;
		color: var(--md-sys-color-on-surface-variant);
	}

	.arrow-icon {
		color: var(--md-sys-color-on-surface-variant);
		font-size: 20px;
		transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.quick-link-card:hover .arrow-icon {
		color: var(--md-sys-color-primary);
		transform: translateX(4px);
	}

	/* Tips Section */
	.tips-section {
		margin-top: var(--md-sys-spacing-md);
	}

	.tip-card {
		display: flex;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
		background: var(--md-sys-color-tertiary-container);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.tip-icon {
		font-size: 24px;
		color: var(--md-sys-color-on-tertiary-container);
		flex-shrink: 0;
	}

	.tip-content h4 {
		margin: 0;
		color: var(--md-sys-color-on-tertiary-container);
	}

	.tip-content p {
		margin: var(--md-sys-spacing-xs) 0 0;
		color: var(--md-sys-color-on-tertiary-container);
		opacity: 0.9;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.welcome-content {
			flex-direction: column;
			text-align: center;
		}

		.quick-links-grid {
			grid-template-columns: 1fr;
		}

		.tip-card {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
