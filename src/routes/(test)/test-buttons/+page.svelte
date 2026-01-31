<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/button/filled-tonal-button.js';
	import '@material/web/button/text-button.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/checkbox/checkbox.js';
	import '@material/web/radio/radio.js';

	let rentalType = $state('hourly');
	let paymentMethod = $state<'cash' | 'credit'>('cash');
	let selectedItems = $state<number[]>([1, 3]);
	let condition = $state('good');
</script>

<div class="test-page">
	<h1 class="md-headline-medium">Button Alignment Test Page</h1>

	<!-- 1. App Header -->
	<h2 class="md-title-large section-title">1. App Header (buttons + badge inline)</h2>
	<header class="app-header">
		<div class="header-start">
			<span class="material-symbols-rounded header-icon">point_of_sale</span>
			<h1 class="md-headline-small">Rental Manager</h1>
		</div>
		<div class="header-end">
			<div class="operator-badge">
				<span class="material-symbols-rounded">person</span>
				<span class="md-label-large">John Doe</span>
			</div>
			<md-outlined-button>
				<span class="material-symbols-rounded" slot="icon">logout</span>
				End Shift
			</md-outlined-button>
		</div>
	</header>

	<!-- 2. Action Bar -->
	<h2 class="md-title-large section-title">2. Action Bar (filled + tonal + stat badges)</h2>
	<div class="action-bar">
		<md-filled-button>
			<span class="material-symbols-rounded" slot="icon">add</span>
			New Rental
		</md-filled-button>
		<md-filled-tonal-button>
			<span class="material-symbols-rounded" slot="icon">shopping_cart</span>
			Store Sale
		</md-filled-tonal-button>
		<div class="stats-badges">
			<div class="stat-badge active">
				<span class="material-symbols-rounded">pending</span>
				<span class="md-label-medium">3 Active</span>
			</div>
			<div class="stat-badge previous">
				<span class="material-symbols-rounded">history</span>
				<span class="md-label-medium">5 Previous</span>
			</div>
		</div>
	</div>

	<!-- 3. Modal Footer -->
	<h2 class="md-title-large section-title">3. Modal Footer (outlined + filled)</h2>
	<div class="modal-footer">
		<md-outlined-button>Cancel</md-outlined-button>
		<md-filled-button>
			<span class="material-symbols-rounded" slot="icon">check</span>
			Create Rental
		</md-filled-button>
	</div>

	<!-- 4. Rental Card Footer -->
	<h2 class="md-title-large section-title">4. Rental Card Footer (time + tonal button)</h2>
	<div class="rental-footer">
		<div class="time-info">
			<span class="material-symbols-rounded icon-sm">schedule</span>
			<span class="md-body-small">Started 10:30 AM</span>
			<span class="elapsed-badge">1h 30m</span>
		</div>
		<md-filled-tonal-button>
			<span class="material-symbols-rounded" slot="icon">check_circle</span>
			Close Rental
		</md-filled-tonal-button>
	</div>

	<!-- 5. Rental Type Selector (pill radio buttons) -->
	<h2 class="md-title-large section-title">5. Rental Type Selector (pill radio buttons)</h2>
	<div class="rental-type-selector">
		<label class="type-option" class:selected={rentalType === 'hourly'}>
			<input type="radio" bind:group={rentalType} value="hourly" />
			<span class="material-symbols-rounded">timer</span>
			<div class="type-info">
				<span class="md-body-medium">Hourly</span>
				<span class="md-label-medium price-text">$15/hr</span>
			</div>
		</label>
		<label class="type-option" class:selected={rentalType === 'fullDay'}>
			<input type="radio" bind:group={rentalType} value="fullDay" />
			<span class="material-symbols-rounded">wb_sunny</span>
			<div class="type-info">
				<span class="md-body-medium">Full Day</span>
				<span class="md-label-medium price-text">$75</span>
			</div>
		</label>
	</div>

	<!-- 6. Tracked Item Buttons -->
	<h2 class="md-title-large section-title">6. Tracked Item Buttons (pill toggles)</h2>
	<div class="tracked-items-grid">
		{#each [1, 2, 3, 4, 5] as id}
			{@const isSelected = selectedItems.includes(id)}
			<button
				class="tracked-item-btn"
				class:selected={isSelected}
				onclick={() => {
					if (isSelected) selectedItems = selectedItems.filter(i => i !== id);
					else selectedItems = [...selectedItems, id];
				}}
			>
				<span class="material-symbols-rounded">{isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
				<span class="md-label-large">K-00{id}</span>
			</button>
		{/each}
	</div>

	<!-- 7. Condition Options -->
	<h2 class="md-title-large section-title">7. Condition Options (close rental modal pills)</h2>
	<div class="condition-options">
		<label class="condition-option" class:selected={condition === 'good'}>
			<input type="radio" bind:group={condition} value="good" />
			<span class="material-symbols-rounded good">check_circle</span>
			<span class="md-label-medium">Good</span>
		</label>
		<label class="condition-option" class:selected={condition === 'damaged'}>
			<input type="radio" bind:group={condition} value="damaged" />
			<span class="material-symbols-rounded damaged">warning</span>
			<span class="md-label-medium">Damaged</span>
		</label>
		<label class="condition-option" class:selected={condition === 'missing'}>
			<input type="radio" bind:group={condition} value="missing" />
			<span class="material-symbols-rounded missing">cancel</span>
			<span class="md-label-medium">Missing</span>
		</label>
	</div>

	<!-- 8. Payment Options -->
	<h2 class="md-title-large section-title">8. Payment Options (close rental modal pills)</h2>
	<div class="payment-options">
		<label class="payment-option" class:selected={paymentMethod === 'cash'}>
			<input type="radio" bind:group={paymentMethod} value="cash" />
			<span class="material-symbols-rounded">payments</span>
			<span class="md-label-large">Cash</span>
		</label>
		<label class="payment-option" class:selected={paymentMethod === 'credit'}>
			<input type="radio" bind:group={paymentMethod} value="credit" />
			<span class="material-symbols-rounded">credit_card</span>
			<span class="md-label-large">Credit</span>
		</label>
	</div>

	<!-- 9. Quantity Control -->
	<h2 class="md-title-large section-title">9. Quantity Control</h2>
	<div class="quantity-control">
		<button class="qty-btn">
			<span class="material-symbols-rounded">remove</span>
		</button>
		<span class="qty-value md-title-large">2</span>
		<button class="qty-btn">
			<span class="material-symbols-rounded">add</span>
		</button>
	</div>

	<!-- 10. Mixed Material Web Buttons -->
	<h2 class="md-title-large section-title">10. Mixed Material Web Buttons Row</h2>
	<div class="button-row">
		<md-filled-button>
			<span class="material-symbols-rounded" slot="icon">add</span>
			Filled
		</md-filled-button>
		<md-outlined-button>
			<span class="material-symbols-rounded" slot="icon">edit</span>
			Outlined
		</md-outlined-button>
		<md-filled-tonal-button>
			<span class="material-symbols-rounded" slot="icon">star</span>
			Tonal
		</md-filled-tonal-button>
		<md-text-button>
			<span class="material-symbols-rounded" slot="icon">info</span>
			Text
		</md-text-button>
		<md-icon-button>
			<span class="material-symbols-rounded">close</span>
		</md-icon-button>
	</div>

	<!-- 11. Login Actions -->
	<h2 class="md-title-large section-title">11. Login Page Actions</h2>
	<div class="login-actions">
		<md-outlined-button>
			<span class="material-symbols-rounded" slot="icon">arrow_back</span>
			Back
		</md-outlined-button>
		<md-filled-button>
			<span class="material-symbols-rounded" slot="icon">login</span>
			Start Shift
		</md-filled-button>
	</div>

	<!-- 12. Shift Summary Modal Footer -->
	<h2 class="md-title-large section-title">12. Shift Summary Footer (danger button)</h2>
	<div class="modal-footer">
		<md-outlined-button>Cancel</md-outlined-button>
		<md-filled-button class="danger-btn">
			<span class="material-symbols-rounded" slot="icon">download</span>
			End Shift & Download Report
		</md-filled-button>
	</div>
</div>

<style>
	.test-page {
		padding: var(--md-sys-spacing-lg);
		max-width: 900px;
		margin: 0 auto;
	}

	.section-title {
		color: var(--md-sys-color-primary);
		margin: var(--md-sys-spacing-lg) 0 var(--md-sys-spacing-sm);
	}

	/* === App Header === */
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		background: var(--md-sys-color-surface);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		box-shadow: var(--md-sys-elevation-level1);
	}

	.header-start {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.header-icon {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.header-start h1 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.header-end {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
	}

	.operator-badge {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-md);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.operator-badge .material-symbols-rounded {
		font-size: 20px;
	}

	.app-header md-outlined-button {
		flex-shrink: 0;
		white-space: nowrap;
	}

	/* === Action Bar === */
	.action-bar {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		flex-wrap: wrap;
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.action-bar md-filled-button,
	.action-bar md-filled-tonal-button {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.stats-badges {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		margin-left: auto;
	}

	.stat-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-small);
		height: 40px;
	}

	.stat-badge.active {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.stat-badge.previous {
		background: var(--md-sys-color-surface-container-high);
		color: var(--md-sys-color-on-surface-variant);
	}

	.stat-badge .material-symbols-rounded {
		font-size: 18px;
	}

	/* === Modal Footer === */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface);
	}

	/* === Rental Footer === */
	.rental-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-md);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	.time-info {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		color: var(--md-sys-color-on-surface-variant);
	}

	.elapsed-badge {
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-small);
		font-weight: 500;
	}

	/* === Rental Type Selector === */
	.rental-type-selector {
		display: flex;
		gap: var(--md-sys-spacing-md);
	}

	.type-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md) var(--md-sys-spacing-xl);
		min-height: 60px;
		background: var(--md-sys-color-surface-container-low);
		border: 2px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.type-option.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
	}

	.type-option input {
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

	.type-option .material-symbols-rounded {
		font-size: 24px;
		color: var(--md-sys-color-primary);
		flex-shrink: 0;
	}

	.type-info {
		display: flex;
		flex-direction: column;
	}

	.price-text {
		color: var(--md-sys-color-primary);
	}

	/* === Tracked Item Buttons === */
	.tracked-items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--md-sys-spacing-sm);
	}

	.tracked-item-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-xl);
		min-height: 44px;
		background: var(--md-sys-color-surface);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-small);
		cursor: pointer;
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.tracked-item-btn.selected {
		background: var(--md-sys-color-primary-container);
		border-color: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary-container);
	}

	.tracked-item-btn .material-symbols-rounded {
		font-size: 20px;
		flex-shrink: 0;
	}

	/* === Condition Options === */
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

	.condition-option.selected {
		border-color: var(--md-sys-color-primary);
		background: var(--md-sys-color-surface-container-high);
	}

	.condition-option .material-symbols-rounded.good {
		color: var(--md-sys-color-success);
		font-size: 28px;
	}

	.condition-option .material-symbols-rounded.damaged {
		color: var(--md-sys-color-warning);
		font-size: 28px;
	}

	.condition-option .material-symbols-rounded.missing {
		color: var(--md-sys-color-error);
		font-size: 28px;
	}

	/* === Payment Options === */
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

	/* === Quantity Control === */
	.quantity-control {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		max-width: 250px;
	}

	.qty-btn {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-surface-container-high);
		border: none;
		border-radius: var(--md-sys-shape-corner-full);
		color: var(--md-sys-color-on-surface);
		cursor: pointer;
	}

	.qty-btn .material-symbols-rounded {
		font-size: 24px;
	}

	.qty-value {
		flex: 1;
		text-align: center;
		color: var(--md-sys-color-on-surface);
	}

	/* === Button Row === */
	.button-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	/* === Login Actions === */
	.login-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-md);
		background: var(--md-sys-color-surface-container-low);
		border: 1px solid var(--md-sys-color-outline-variant);
		border-radius: var(--md-sys-shape-corner-medium);
	}

	/* === Danger Button === */
	.danger-btn {
		--md-filled-button-container-color: var(--md-sys-color-error);
		--md-filled-button-label-text-color: var(--md-sys-color-on-error);
	}

	/* === Icon sizes === */
	.icon-sm {
		font-size: 18px;
	}
</style>
