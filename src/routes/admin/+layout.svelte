<script lang="ts">
	import '@material/web/button/text-button.js';

	let { children } = $props();
</script>

<div class="admin-layout">
	<nav class="admin-nav">
		<a href="/admin">Admin</a>
		<a href="/admin/operators">Operators</a>
		<a href="/admin/equipment">Equipment</a>
		<a href="/admin/rental-products">Rental Products</a>
		<a href="/admin/store-products">Store Products</a>
		<a href="/admin/guides">Guides</a>
		<a href="/admin/inventory">Inventory</a>
		<a href="/">Back to App</a>
	</nav>
	<main class="admin-content">
		{@render children()}
	</main>
</div>

<style>
	.admin-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	.admin-nav {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: var(--md-sys-color-surface-container);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}
	.admin-nav a {
		color: var(--md-sys-color-on-surface);
		text-decoration: none;
		padding: 0.5rem 1rem;
	}
	.admin-nav a:hover {
		background: var(--md-sys-color-surface-container-high);
		border-radius: 0.5rem;
	}
	.admin-content {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}
</style>
