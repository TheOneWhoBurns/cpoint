<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/filled-tonal-button.js';

	let {
		hasStoreProducts = false,
		hasTourProducts = false,
		onNewRental,
		onNewReservation,
		onStoreSale,
		onTourBooking
	}: {
		hasStoreProducts?: boolean;
		hasTourProducts?: boolean;
		onNewRental: () => void;
		onNewReservation: () => void;
		onStoreSale: () => void;
		onTourBooking: () => void;
	} = $props();
</script>

<div class="action-bar">
	<md-filled-button onclick={onNewRental}>
		<span class="material-symbols-rounded" slot="icon">add</span>
		New Rental
	</md-filled-button>
	<md-filled-tonal-button onclick={onNewReservation}>
		<span class="material-symbols-rounded" slot="icon">event</span>
		New Reservation
	</md-filled-tonal-button>
	{#if hasStoreProducts}
		<md-filled-tonal-button onclick={onStoreSale}>
			<span class="material-symbols-rounded" slot="icon">shopping_cart</span>
			Store Sale
		</md-filled-tonal-button>
	{/if}
	{#if hasTourProducts}
		<md-filled-tonal-button onclick={onTourBooking}>
			<span class="material-symbols-rounded" slot="icon">tour</span>
			Tour Booking
		</md-filled-tonal-button>
	{/if}
</div>

<style>
	.action-bar {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		margin-bottom: var(--md-sys-spacing-lg);
		flex-wrap: wrap;
	}

	.action-bar md-filled-button,
	.action-bar md-filled-tonal-button {
		flex-shrink: 0;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.action-bar {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
