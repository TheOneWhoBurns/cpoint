<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/radio/radio.js';

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

	function getElapsedTime(startedAt: string): string {
		const start = new Date(startedAt);
		const now = new Date();
		const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
		const hours = Math.floor(diff / 60);
		const mins = diff % 60;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}
</script>

{#if open && rental}
	<div class="modal-overlay" onclick={handleCancel}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="close-rental-title">
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">check_circle</span>
					<h2 class="md-headline-small" id="close-rental-title">Close Rental</h2>
				</div>
				<md-icon-button onclick={handleCancel} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>

			<div class="modal-body">
				<!-- Rental Summary Card -->
				<div class="rental-summary-card">
					<div class="summary-row">
						<span class="material-symbols-rounded icon-sm">person</span>
						<span class="md-title-medium">{rental.customer?.name || 'Unknown'}</span>
					</div>
					<div class="summary-row">
						<span class="material-symbols-rounded icon-sm">schedule</span>
						<span class="md-body-medium">Started {new Date(rental.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						<span class="elapsed-badge">{getElapsedTime(rental.startedAt)}</span>
					</div>
				</div>

				<!-- Equipment Condition Section -->
				<div class="section">
					<div class="section-header">
						<span class="material-symbols-rounded">handyman</span>
						<span class="md-title-small">Equipment Condition</span>
					</div>

					{#each rental.items as item}
						{#if item.type === 'tracked'}
							<div class="condition-card">
								<div class="item-header">
									<span class="material-symbols-rounded icon-sm">qr_code_2</span>
									<span class="md-body-medium">{item.name}</span>
									<code class="item-code">{item.code}</code>
								</div>
								<div class="condition-options">
									<label class="condition-option" class:selected={trackedConditions[item.itemId || 0] === 'good'}>
										<input
											type="radio"
											bind:group={trackedConditions[item.itemId || 0]}
											value="good"
											disabled={loading}
										/>
										<span class="material-symbols-rounded good">check_circle</span>
										<span class="md-label-medium">Good</span>
									</label>
									<label class="condition-option" class:selected={trackedConditions[item.itemId || 0] === 'damaged'}>
										<input
											type="radio"
											bind:group={trackedConditions[item.itemId || 0]}
											value="damaged"
											disabled={loading}
										/>
										<span class="material-symbols-rounded damaged">warning</span>
										<span class="md-label-medium">Damaged</span>
									</label>
									<label class="condition-option" class:selected={trackedConditions[item.itemId || 0] === 'missing'}>
										<input
											type="radio"
											bind:group={trackedConditions[item.itemId || 0]}
											value="missing"
											disabled={loading}
										/>
										<span class="material-symbols-rounded missing">cancel</span>
										<span class="md-label-medium">Missing</span>
									</label>
								</div>
							</div>
						{:else if item.type === 'generic'}
							<div class="condition-card">
								<div class="item-header">
									<span class="material-symbols-rounded icon-sm">inventory_2</span>
									<span class="md-body-medium">{item.name}</span>
								</div>
								<div class="quantity-return">
									<span class="md-body-small">Returned:</span>
									<div class="quantity-control">
										<button
											class="qty-btn"
											onclick={() => genericReturns[item.categoryId || 0] = Math.max(0, (genericReturns[item.categoryId || 0] || 0) - 1)}
											disabled={loading || (genericReturns[item.categoryId || 0] || 0) <= 0}
											aria-label="Decrease quantity for {item.name}"
										>
											<span class="material-symbols-rounded">remove</span>
										</button>
										<span class="qty-value md-title-medium">{genericReturns[item.categoryId || 0] || 0}</span>
										<button
											class="qty-btn"
											onclick={() => genericReturns[item.categoryId || 0] = Math.min(item.quantity || 1, (genericReturns[item.categoryId || 0] || 0) + 1)}
											disabled={loading || (genericReturns[item.categoryId || 0] || 0) >= (item.quantity || 1)}
											aria-label="Increase quantity for {item.name}"
										>
											<span class="material-symbols-rounded">add</span>
										</button>
									</div>
									<span class="md-body-small">/ {item.quantity || 1}</span>
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<!-- Payment Method Section -->
				<div class="section">
					<div class="section-header">
						<span class="material-symbols-rounded">payments</span>
						<span class="md-title-small">Payment Method</span>
					</div>
					<div class="payment-options">
						<label class="payment-option" class:selected={paymentMethod === 'cash'}>
							<input type="radio" bind:group={paymentMethod} value="cash" disabled={loading} />
							<span class="material-symbols-rounded">payments</span>
							<span class="md-label-large">Cash</span>
						</label>
						<label class="payment-option" class:selected={paymentMethod === 'credit'}>
							<input type="radio" bind:group={paymentMethod} value="credit" disabled={loading} />
							<span class="material-symbols-rounded">credit_card</span>
							<span class="md-label-large">Credit</span>
						</label>
					</div>
				</div>

				<!-- Notes Section -->
				<div class="section">
					<div class="section-header">
						<span class="material-symbols-rounded">note</span>
						<span class="md-title-small">Notes</span>
					</div>
					<textarea
						bind:value={notes}
						disabled={loading}
						placeholder="Add any notes about the rental condition..."
						class="notes-textarea"
					></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<md-outlined-button onclick={handleCancel} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button onclick={handleClose} disabled={loading}>
					<span class="material-symbols-rounded" slot="icon">check</span>
					Close Rental
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
		padding: var(--md-sys-spacing-md);
		animation: md-animate-fade-in 0.2s var(--md-sys-motion-easing-standard);
	}

	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		max-width: 550px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: md-animate-scale-in 0.3s var(--md-sys-motion-easing-emphasized-decelerate);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface);
		flex-shrink: 0;
	}

	.modal-title {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.modal-title .material-symbols-rounded {
		font-size: 28px;
		color: var(--md-sys-color-primary);
	}

	.modal-title h2 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.modal-body {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.modal-footer {
		display: flex;
		gap: var(--md-sys-spacing-lg);
		justify-content: flex-end;
		align-items: center;
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface);
		flex-shrink: 0;
	}

	.modal-footer md-outlined-button,
	.modal-footer md-filled-button {
		min-width: auto;
	}

	/* Rental Summary Card */
	.rental-summary-card {
		background: var(--md-sys-color-primary-container);
		padding: var(--md-sys-spacing-md);
		border-radius: var(--md-sys-shape-corner-medium);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.summary-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		color: var(--md-sys-color-on-primary-container);
	}

	.elapsed-badge {
		margin-left: auto;
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 500;
	}

	/* Sections */
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		color: var(--md-sys-color-on-surface);
		margin-bottom: var(--md-sys-spacing-md);
		font: var(--md-sys-typescale-title-small);
	}

	.section-header .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	/* Condition Card */
	.condition-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}

	.item-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		margin-bottom: var(--md-sys-spacing-sm);
	}

	.item-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
	}

	.item-code {
		margin-left: auto;
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-surface-container-high);
		border-radius: var(--md-sys-shape-corner-extra-small);
		font-family: monospace;
		font-size: 0.8rem;
	}

	.condition-options {
		display: flex;
		gap: var(--md-sys-spacing-sm);
	}

	.condition-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-xl);
		min-height: 72px;
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.condition-option input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.condition-option:has(input:focus-visible) {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: 2px;
	}

	.condition-option:hover {
		background: var(--md-sys-color-surface-container);
	}

	.condition-option.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-surface-container-high);
	}

	.condition-option .material-symbols-rounded.good {
		color: var(--md-sys-color-success);
	}

	.condition-option .material-symbols-rounded.damaged {
		color: var(--md-sys-color-warning);
	}

	.condition-option .material-symbols-rounded.missing {
		color: var(--md-sys-color-error);
	}

	/* Quantity Return */
	.quantity-return {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.quantity-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.qty-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-surface-container-high);
		border: none;
		border-radius: var(--md-sys-shape-corner-full);
		color: var(--md-sys-color-on-surface);
		cursor: pointer;
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.qty-btn:hover:not(:disabled) {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.qty-btn:disabled {
		opacity: 0.38;
		cursor: not-allowed;
	}

	.qty-btn .material-symbols-rounded {
		font-size: 18px;
	}

	.qty-value {
		min-width: 32px;
		text-align: center;
		color: var(--md-sys-color-on-surface);
	}

	/* Payment Options */
	.payment-options {
		display: flex;
		gap: var(--md-sys-spacing-md);
	}

	.payment-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-xl);
		min-height: 60px;
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.payment-option input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.payment-option:has(input:focus-visible) {
		outline: 2px solid var(--md-sys-color-primary);
		outline-offset: 2px;
	}

	.payment-option:hover {
		background: var(--md-sys-color-surface-container);
	}

	.payment-option.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}

	.payment-option .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	.payment-option.selected .material-symbols-rounded {
		color: var(--md-sys-color-on-primary-container);
	}

	/* Notes Textarea */
	.notes-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--md-sys-spacing-md);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font-family: inherit;
		font: var(--md-sys-typescale-body-medium);
		resize: vertical;
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	.notes-textarea:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
		border-width: 2px;
	}

	/* Icon Sizes */
	.icon-sm {
		font-size: 18px;
	}

	/* Animations */
	@keyframes md-animate-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes md-animate-scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Responsive */
	@media (max-width: 480px) {
		.condition-options {
			flex-direction: column;
		}

		.payment-options {
			flex-direction: column;
		}
	}
</style>
