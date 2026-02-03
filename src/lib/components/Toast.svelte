<script lang="ts">
	let {
		message = '',
		variant = 'success',
		visible = $bindable(false),
		duration = 3000
	}: {
		message: string;
		variant?: 'success' | 'error' | 'warning' | 'info';
		visible: boolean;
		duration?: number;
	} = $props();

	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (visible) {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				visible = false;
			}, duration);
		}
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	});

	const iconMap = {
		success: 'check_circle',
		error: 'error',
		warning: 'warning',
		info: 'info'
	};
</script>

{#if visible}
	<div class="toast-container" role="status" aria-live="polite">
		<div class="toast toast-{variant}">
			<span class="material-symbols-rounded toast-icon">{iconMap[variant]}</span>
			<span class="toast-message md-body-medium">{message}</span>
			<button class="toast-dismiss" onclick={() => visible = false} aria-label="Dismiss">
				<span class="material-symbols-rounded">close</span>
			</button>
		</div>
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: var(--md-sys-spacing-lg);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		pointer-events: none;
		animation: toast-slide-up 0.3s var(--md-sys-motion-easing-decelerate);
	}

	@media (max-width: 768px) {
		.toast-container {
			bottom: calc(var(--md-sys-spacing-lg) + 72px);
			left: var(--md-sys-spacing-md);
			right: var(--md-sys-spacing-md);
			transform: none;
		}
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		border-radius: var(--md-sys-shape-corner-small);
		box-shadow: var(--md-sys-elevation-level3);
		pointer-events: auto;
		min-width: 288px;
		max-width: 560px;
	}

	.toast-success {
		background: var(--md-sys-color-inverse-surface);
		color: var(--md-sys-color-inverse-on-surface);
	}

	.toast-error {
		background: var(--md-sys-color-error);
		color: var(--md-sys-color-on-error);
	}

	.toast-warning {
		background: var(--md-sys-color-inverse-surface);
		color: var(--md-sys-color-inverse-on-surface);
	}

	.toast-info {
		background: var(--md-sys-color-inverse-surface);
		color: var(--md-sys-color-inverse-on-surface);
	}

	.toast-icon {
		font-size: 20px;
		flex-shrink: 0;
	}

	.toast-success .toast-icon {
		color: var(--md-sys-color-inverse-primary);
	}

	.toast-message {
		flex: 1;
	}

	.toast-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		border-radius: var(--md-sys-shape-corner-full);
		flex-shrink: 0;
		opacity: 0.8;
	}

	.toast-dismiss:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.toast-dismiss .material-symbols-rounded {
		font-size: 18px;
	}

	@keyframes toast-slide-up {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (max-width: 768px) {
		@keyframes toast-slide-up {
			from {
				opacity: 0;
				transform: translateY(16px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}
</style>
