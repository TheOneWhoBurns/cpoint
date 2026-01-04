<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Rental Manager</title>
</svelte:head>

{@render children()}
