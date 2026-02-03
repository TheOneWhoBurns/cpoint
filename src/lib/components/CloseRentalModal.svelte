<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/radio/radio.js';
	import '@material/web/checkbox/checkbox.js';

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
		pricing?: { type?: string; hourly?: number; fullDay?: number };
	}

	let {
		open = $bindable(false),
		rental,
		operatorId = 0,
		onClose = () => {},
		onCancel = () => {}
	} = $props();

	let trackedConditions = $state<Record<number, string>>({});
	let genericReturns = $state<Record<number, number>>({});
	let notes = $state('');
	let loading = $state(false);

	// Split payment
	let cashAmount = $state(0);
	let creditAmount = $state(0);

	// Discount and yet-to-pay (require passcode)
	let discountAmount = $state(0);
	let yetToPay = $state(false);
	let yetToPayAmount = $state(0);
	let passcodeInput = $state('');
	let passcodeVerified = $state(false);
	let passcodeError = $state('');

	// Calculate price based on rental type and elapsed time
	// Charges in half-hour increments, rounded to whole dollars
	function calculatePrice(): number {
		if (!rental?.pricing) return 0;
		const pricing = rental.pricing;

		if (pricing.type === 'fullDay') {
			return Math.round(pricing.fullDay || 0);
		} else if (pricing.type === 'hourly') {
			const startTime = new Date(rental.startedAt).getTime();
			const endTime = new Date().getTime();
			const diffMs = endTime - startTime;
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			const hourlyRate = pricing.hourly || 0;
			const halfHours = Math.max(1, Math.ceil(diffMinutes / 30));
			return Math.round((hourlyRate / 2) * halfHours);
		}
		return 0;
	}

	const calculatedPrice = $derived(calculatePrice());
	const priceAfterDiscount = $derived(Math.max(0, calculatedPrice - discountAmount));
	const amountDue = $derived(priceAfterDiscount - (yetToPay ? yetToPayAmount : 0));
	const paymentTotal = $derived(cashAmount + creditAmount);
	const remainingToPay = $derived(amountDue - paymentTotal);

	// Auto-fill cash amount when modal opens
	$effect(() => {
		if (open && rental) {
			const price = calculatePrice();
			cashAmount = price;
			creditAmount = 0;
			discountAmount = 0;
			yetToPay = false;
			yetToPayAmount = 0;
			passcodeInput = '';
			passcodeVerified = false;
			passcodeError = '';
		}
	});

	async function verifyPasscode() {
		try {
			const res = await fetch('/api/operators/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ operatorId, passcode: passcodeInput })
			});
			if (res.ok) {
				passcodeVerified = true;
				passcodeError = '';
			} else {
				passcodeError = 'Invalid passcode';
				passcodeVerified = false;
			}
		} catch {
			passcodeError = 'Verification failed';
			passcodeVerified = false;
		}
	}

	function resetForm() {
		trackedConditions = {};
		genericReturns = {};
		notes = '';
		cashAmount = 0;
		creditAmount = 0;
		discountAmount = 0;
		yetToPay = false;
		yetToPayAmount = 0;
		passcodeInput = '';
		passcodeVerified = false;
		passcodeError = '';
	}

	function handleClose() {
		// Validate payment amounts
		if (remainingToPay > 0 && !yetToPay) {
			return; // Don't close if payment doesn't cover amount
		}

		loading = true;
		const returnData = {
			trackedConditions: Object.entries(trackedConditions).map(([itemId, condition]) => {
				const item = rental?.items.find((i: RentalItem) => i.itemId === parseInt(itemId));
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
			// Split payment data
			cashAmount,
			creditAmount,
			discount: discountAmount,
			yetToPay: yetToPay ? yetToPayAmount : 0,
			calculatedPrice,
			finalPrice: priceAfterDiscount
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

	function getHalfHoursCharged(): number {
		if (!rental?.pricing || rental.pricing.type !== 'hourly') return 0;
		const startTime = new Date(rental.startedAt).getTime();
		const endTime = new Date().getTime();
		const diffMs = endTime - startTime;
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		return Math.max(1, Math.ceil(diffMinutes / 30));
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

				<!-- Pricing Summary Section -->
				<div class="section pricing-summary">
					<div class="section-header">
						<span class="material-symbols-rounded">receipt</span>
						<span class="md-title-small">Pricing Summary</span>
					</div>
					<div class="pricing-card">
						<div class="pricing-row">
							<span class="md-body-medium">
								{rental.pricing?.type === 'hourly'
									? `${getHalfHoursCharged()} x 30min @ $${rental.pricing?.hourly}/hr`
									: 'Full Day Rate'}
							</span>
							<span class="md-title-medium">${calculatedPrice}</span>
						</div>
						{#if discountAmount > 0}
							<div class="pricing-row discount">
								<span class="md-body-medium">Discount</span>
								<span class="md-title-medium">-${discountAmount}</span>
							</div>
						{/if}
						{#if yetToPay && yetToPayAmount > 0}
							<div class="pricing-row unpaid">
								<span class="md-body-medium">Yet to Pay (Unpaid)</span>
								<span class="md-title-medium">-${yetToPayAmount}</span>
							</div>
						{/if}
						<div class="pricing-row total">
							<span class="md-title-medium">Amount Due Now</span>
							<span class="md-headline-small">${amountDue}</span>
						</div>
					</div>
				</div>

				<!-- Split Payment Section -->
				<div class="section">
					<div class="section-header">
						<span class="material-symbols-rounded">payments</span>
						<span class="md-title-small">Payment (Split Cash/Credit)</span>
					</div>
					<div class="payment-inputs">
						<div class="payment-input-group">
							<label class="payment-input-label">
								<span class="material-symbols-rounded">payments</span>
								<span class="md-body-medium">Cash</span>
							</label>
							<div class="amount-input-wrapper">
								<span class="currency-symbol">$</span>
								<input
									type="number"
									min="0"
									step="1"
									bind:value={cashAmount}
									disabled={loading}
									class="amount-input"
								/>
							</div>
						</div>
						<div class="payment-input-group">
							<label class="payment-input-label">
								<span class="material-symbols-rounded">credit_card</span>
								<span class="md-body-medium">Credit Card</span>
							</label>
							<div class="amount-input-wrapper">
								<span class="currency-symbol">$</span>
								<input
									type="number"
									min="0"
									step="1"
									bind:value={creditAmount}
									disabled={loading}
									class="amount-input"
								/>
							</div>
						</div>
					</div>
					<div class="payment-summary">
						<div class="payment-summary-row">
							<span class="md-body-medium">Total Payment</span>
							<span class="md-title-medium">${paymentTotal}</span>
						</div>
						{#if remainingToPay > 1}
							<div class="payment-summary-row remaining">
								<span class="md-body-medium">Remaining</span>
								<span class="md-title-medium error">${remainingToPay}</span>
							</div>
						{:else if remainingToPay < -1}
							<div class="payment-summary-row change">
								<span class="md-body-medium">Change Due</span>
								<span class="md-title-medium">${Math.abs(remainingToPay)}</span>
							</div>
						{:else}
							<div class="payment-summary-row complete">
								<span class="material-symbols-rounded">check_circle</span>
								<span class="md-body-medium">Payment Complete</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Discount & Yet-to-Pay Section (requires passcode) -->
				<div class="section special-options">
					<div class="section-header">
						<span class="material-symbols-rounded">tune</span>
						<span class="md-title-small">Discount / Yet to Pay</span>
						<span class="passcode-required-badge">Passcode Required</span>
					</div>

					{#if !passcodeVerified}
						<div class="passcode-entry">
							<p class="md-body-small">Enter your passcode to apply discount or mark as partially unpaid</p>
							<div class="passcode-input-row">
								<input
									type="password"
									maxlength="4"
									placeholder="4-digit passcode"
									bind:value={passcodeInput}
									class="passcode-input"
								/>
								<md-filled-button onclick={verifyPasscode} disabled={passcodeInput.length !== 4}>
									Verify
								</md-filled-button>
							</div>
							{#if passcodeError}
								<p class="passcode-error md-body-small">{passcodeError}</p>
							{/if}
						</div>
					{:else}
						<div class="special-options-unlocked">
							<div class="option-row">
								<label class="option-label">
									<span class="material-symbols-rounded">percent</span>
									<span class="md-body-medium">Discount Amount</span>
								</label>
								<div class="amount-input-wrapper small">
									<span class="currency-symbol">$</span>
									<input
										type="number"
										min="0"
										max={calculatedPrice}
										step="1"
										bind:value={discountAmount}
										disabled={loading}
										class="amount-input"
									/>
								</div>
							</div>
							<div class="option-row">
								<label class="yet-to-pay-checkbox">
									<md-checkbox
										checked={yetToPay}
										onchange={(e: Event) => yetToPay = (e.target as HTMLInputElement).checked}
										disabled={loading}
									></md-checkbox>
									<span class="material-symbols-rounded">schedule_send</span>
									<span class="md-body-medium">Mark as partially unpaid (yet to pay)</span>
								</label>
							</div>
							{#if yetToPay}
								<div class="option-row indent">
									<label class="option-label">
										<span class="md-body-small">Unpaid amount:</span>
									</label>
									<div class="amount-input-wrapper small">
										<span class="currency-symbol">$</span>
										<input
											type="number"
											min="0"
											max={priceAfterDiscount}
											step="1"
											bind:value={yetToPayAmount}
											disabled={loading}
											class="amount-input"
										/>
									</div>
								</div>
							{/if}
							<div class="passcode-verified-badge">
								<span class="material-symbols-rounded">verified</span>
								<span class="md-label-medium">Passcode Verified</span>
							</div>
						</div>
					{/if}
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

	/* Pricing Summary */
	.pricing-card {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}

	.pricing-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-xs) 0;
	}

	.pricing-row.discount .md-title-medium {
		color: var(--md-sys-color-success);
	}

	.pricing-row.unpaid .md-title-medium {
		color: var(--md-sys-color-warning);
	}

	.pricing-row.total {
		border-top: 1px solid var(--md-sys-color-outline-variant);
		margin-top: var(--md-sys-spacing-sm);
		padding-top: var(--md-sys-spacing-sm);
	}

	.pricing-row.total .md-headline-small {
		color: var(--md-sys-color-primary);
		font-weight: 600;
	}

	/* Split Payment */
	.payment-inputs {
		display: flex;
		gap: var(--md-sys-spacing-md);
	}

	.payment-input-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-xs);
	}

	.payment-input-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.payment-input-label .material-symbols-rounded {
		font-size: 18px;
	}

	.amount-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
	}

	.amount-input-wrapper.small {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
	}

	.amount-input-wrapper:focus-within {
		border-color: var(--md-sys-color-primary);
		border-width: 2px;
	}

	.currency-symbol {
		color: var(--md-sys-color-on-surface-variant);
		font: var(--md-sys-typescale-body-large);
		margin-right: var(--md-sys-spacing-xs);
	}

	.amount-input {
		flex: 1;
		border: none;
		background: transparent;
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-on-surface);
		width: 100%;
		min-width: 60px;
	}

	.amount-input:focus {
		outline: none;
	}

	.amount-input::-webkit-outer-spin-button,
	.amount-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.payment-summary {
		margin-top: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.payment-summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-xs) 0;
	}

	.payment-summary-row.remaining .md-title-medium.error {
		color: var(--md-sys-color-error);
	}

	.payment-summary-row.change .md-title-medium {
		color: var(--md-sys-color-tertiary);
	}

	.payment-summary-row.complete {
		color: var(--md-sys-color-success);
		justify-content: center;
		gap: var(--md-sys-spacing-xs);
	}

	/* Special Options (Discount/Yet-to-Pay) */
	.special-options {
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		padding: var(--md-sys-spacing-md);
	}

	.passcode-required-badge {
		margin-left: auto;
		padding: 2px 8px;
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
	}

	.passcode-entry {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.passcode-entry p {
		margin: 0;
		color: var(--md-sys-color-on-surface-variant);
	}

	.passcode-input-row {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		align-items: center;
	}

	.passcode-input {
		flex: 1;
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-body-large);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}

	.passcode-input:focus {
		outline: none;
		border-color: var(--md-sys-color-primary);
	}

	.passcode-error {
		color: var(--md-sys-color-error);
		margin: 0;
	}

	.special-options-unlocked {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.option-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--md-sys-spacing-md);
	}

	.option-row.indent {
		padding-left: var(--md-sys-spacing-xl);
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
	}

	.option-label .material-symbols-rounded {
		font-size: 18px;
		color: var(--md-sys-color-primary);
	}

	.yet-to-pay-checkbox {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		cursor: pointer;
	}

	.yet-to-pay-checkbox .material-symbols-rounded {
		font-size: 18px;
		color: var(--md-sys-color-warning);
	}

	.passcode-verified-badge {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-small);
		margin-top: var(--md-sys-spacing-sm);
		justify-content: center;
	}

	/* Responsive */
	@media (max-width: 480px) {
		.condition-options {
			flex-direction: column;
		}

		.payment-inputs {
			flex-direction: column;
		}
	}
</style>
