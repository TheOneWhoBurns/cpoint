<script lang="ts">
	import PreviousRentalCard from '$lib/components/PreviousRentalCard.svelte';

	let {
		rentals
	}: {
		rentals: any[];
	} = $props();
</script>

{#if rentals.length === 0}
	<div class="empty-state">
		<span class="material-symbols-rounded empty-icon">history</span>
		<p class="md-body-large">No previous rentals</p>
	</div>
{:else}
	<div class="card-grid">
		{#each rentals as rental (rental.id)}
			<PreviousRentalCard {rental} />
		{/each}
	</div>
{/if}

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
	}
	.empty-icon { font-size: 48px; opacity: 0.5; }
</style>
