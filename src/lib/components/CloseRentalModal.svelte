<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	interface RentalItem {
		type: string;
		itemId?: number;
		categoryId?: number;
		code?: string;
		name: string;
		quantity?: number;
	}

	interface Rental {
		id: number;
		items: RentalItem[];
		customer?: { name?: string };
		startedAt: string;
		pricing?: { type?: string };
	}

	let {
		open = $bindable(false),
		rental,
		onClose = () => {},
		onCancel = () => {}
	} = $props();

	let trackedConditions = $state<Record<number, string>>({});
	let genericReturns = $state<Record<number, number>>({});
	let notes = $state('');
	let paymentMethod = $state<'cash' | 'credit'>('cash');
	let loading = $state(false);

	function resetForm() {
		trackedConditions = {};
		genericReturns = {};
		notes = '';
		paymentMethod = 'cash';
	}

	function handleClose() {
		loading = true;
		const returnData = {
			trackedConditions: Object.entries(trackedConditions).map(([itemId, condition]) => {
				const item = rental?.items.find(i => i.itemId === parseInt(itemId));
				return {
					itemId: parseInt(itemId),
					condition,
					code: item?.code
				};
			}),
			genericReturns: Object.entries(genericReturns).map(([categoryId, quantityReturned]) => ({
				categoryId: parseInt(categoryId),
				quantityReturned
			})),
			notes,
			paymentMethod
		};
		onClose(returnData);
		resetForm();
		open = false;
		loading = false;
	}

	function handleCancel() {
		onCancel();
		resetForm();
		open = false;
	}

	$effect(() => {
		if (open && rental) {
			const items = rental.items as RentalItem[];
			items.forEach(item => {
				if (item.type === 'tracked' && item.itemId) {
					trackedConditions[item.itemId] = trackedConditions[item.itemId] || 'good';
				} else if (item.type === 'generic' && item.categoryId) {
					genericReturns[item.categoryId] = genericReturns[item.categoryId] || (item.quantity || 1);
				}
			});
		}
	});
</script>

{#if open && rental}
	<div class="modal-overlay" onclick={handleCancel}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Close Rental</h2>
				<button class="close-modal" onclick={handleCancel}>x</button>
			</div>

			<div class="rental-summary">
				<p><strong>Customer:</strong> {rental.customer?.name || 'Unknown'}</p>
				<p><strong>Started:</strong> {new Date(rental.startedAt).toLocaleString()}</p>
			</div>

			<div class="section">
				<h3>Equipment Condition</h3>
				{#each rental.items as item}
					{#if item.type === 'tracked'}
						<div class="condition-item">
							<label>{item.name} ({item.code})</label>
							<div class="condition-options">
								<label>
									<input
										type="radio"
										bind:group={trackedConditions[item.itemId || 0]}
										value="good"
										disabled={loading}
									/>
									Good ✓
								</label>
								<label>
									<input
										type="radio"
										bind:group={trackedConditions[item.itemId || 0]}
										value="damaged"
										disabled={loading}
									/>
									Damaged ⚠
								</label>
								<label>
									<input
										type="radio"
										bind:group={trackedConditions[item.itemId || 0]}
										value="missing"
										disabled={loading}
									/>
									Missing ✗
								</label>
							</div>
						</div>
					{:else if item.type === 'generic'}
						<div class="generic-return">
							<label>{item.name}</label>
							<div style="display: flex; align-items: center; gap: 0.5rem;">
								<span>Returned:</span>
								<input
									type="number"
									min="0"
									max={item.quantity || 1}
									bind:value={genericReturns[item.categoryId || 0]}
									disabled={loading}
									style="width: 80px; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px;"
								/>
								<span>/ {item.quantity || 1}</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<div class="section">
				<h3>Payment Method</h3>
				<div class="payment-options">
					<label class:selected={paymentMethod === 'cash'}>
						<input type="radio" bind:group={paymentMethod} value="cash" disabled={loading} />
						Cash
					</label>
					<label class:selected={paymentMethod === 'credit'}>
						<input type="radio" bind:group={paymentMethod} value="credit" disabled={loading} />
						Credit
					</label>
				</div>
			</div>

			<div class="section">
				<h3>Notes</h3>
				<textarea
					bind:value={notes}
					disabled={loading}
					placeholder="Add any notes about the rental condition..."
					style="width: 100%; min-height: 80px; padding: 0.5rem; border: 1px solid var(--md-sys-color-outline); border-radius: 4px; font-family: inherit; resize: vertical;"
				></textarea>
			</div>

			<div class="modal-actions">
				<md-outlined-button onclick={handleCancel} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleClose} disabled={loading}>Close Rental</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
	}
	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}
	.close-modal {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
	}
	.rental-summary {
		background: var(--md-sys-color-surface-container);
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.rental-summary p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant);
	}
	.section {
		margin-bottom: 1.5rem;
	}
	.section h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--md-sys-color-on-surface);
		text-transform: uppercase;
	}
	.condition-item {
		padding: 1rem;
		background: var(--md-sys-color-surface-container-low);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
	.condition-item label {
		display: block;
		font-weight: 500;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface);
	}
	.condition-options {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}
	.condition-options label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: normal;
		margin: 0;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.generic-return {
		padding: 1rem;
		background: var(--md-sys-color-surface-container-low);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
	.generic-return label {
		display: block;
		font-weight: 500;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface);
	}
	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
	.payment-options {
		display: flex;
		gap: 1rem;
	}
	.payment-options label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}
	.payment-options label.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}
</style>
