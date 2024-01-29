<script>

	import { getDatabase,set, ref, onValue, get } from "firebase/database";
	import { onMount } from 'svelte';
	import { cyrb128, sfc32 } from '$lib/rng'
	import { writable } from 'svelte/store';
	import { database } from '$lib/database';
	import { browser } from '$app/environment';

	const context = browser ? new AudioContext() : null;
	let sevenAudioBuffer, diceAudioBuffer;

	$: totalRoll = $theState ? $theState.dice0 + $theState.dice1 : 0;
	$: whaa = $gameState === kGameStateRolled && totalRoll === 7;

	let maxRoll = 6

	function writeRoll(rollAmount, dice0, dice1) {
		const db = getDatabase();
		set(ref(db, 'roll'), rollAmount);
		set(ref(db, 'dice'), {
			dice0: dice0,
			dice1: dice1
		});
		set(ref(db, 'rollHistory'), rollHistory);
	}

	function rollDice(e) {		
		e.preventDefault()
		if ($gameState === kGameStateRolling) return;

		const seed = cyrb128(Date.now().toString());
		const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
		const dice0 = Math.floor(rand() * maxRoll) + 1
		const dice1 = Math.floor(rand() * maxRoll) + 1

		setRoll(dice0, dice1);
	}

	onMount(async() => {
        const response = await fetch('/seven.mp3');
        const arrayBuffer = await response.arrayBuffer();
        sevenAudioBuffer = await context.decodeAudioData(arrayBuffer);

		const response2 = await fetch('/dice.mp3');
        const arrayBuffer2 = await response2.arrayBuffer();
        diceAudioBuffer = await context.decodeAudioData(arrayBuffer2);
	})



	export const kGameStateUnknown = 0
	export const kGameStateRolling = 1
	export const kGameStateRolled = 2

	const kRollingDuration = 1000;

	export const gameState = writable(kGameStateUnknown)
	export const theState = writable({
		dice0: 0,
		dice1: 0,
		timestamp: 0,
		history: Array.from({length: 10}, () => 0),
	})

	onValue(ref(database, 'state'), (snapshot) => {
		if (!browser) return;

		const {timestamp, dice0, dice1} = snapshot.val();
		const offset = timestamp - Date.now();
		const audioContextStartTime = Date.now() - (context.currentTime * 1000);

		gameState.set(kGameStateRolling)

		if (diceAudioBuffer) {
			const rollingNode = context.createBufferSource();
			rollingNode.buffer = diceAudioBuffer;
			rollingNode.connect(context.destination);
			const timeWhenRollingStarted = timestamp - kRollingDuration;
			const audioContextTimeWhenRollingStarted = (timeWhenRollingStarted - audioContextStartTime) / 1000;
			const differenceBetweenCurrentTimeAndStartTime = audioContextTimeWhenRollingStarted - context.currentTime;
			const startTime = context.currentTime + Math.max(differenceBetweenCurrentTimeAndStartTime, 0);
			const startTimeOffset = 0 - Math.min(0, differenceBetweenCurrentTimeAndStartTime);
			rollingNode.start(startTime, startTimeOffset);
		}
		
		if (offset > 0 && dice0 + dice1 === 7) {			
			const whaaNode = context.createBufferSource();
			whaaNode.buffer = sevenAudioBuffer;
			whaaNode.connect(context.destination);
			whaaNode.start(context.currentTime + (offset / 1000))
		}

		setTimeout(() => {
			theState.set(snapshot.val())
			gameState.set(kGameStateRolled)
		}, offset);
	});

	export function setRoll(dice0, dice1) {
		gameState.set(kGameStateRolling)
		const stateRef = ref(database, 'state');
		get(stateRef).then((snapshot) => {
			const {history} = snapshot.val();
			set(stateRef, {
				dice0,
				dice1,
				timestamp: Date.now() + kRollingDuration,
				history: [dice0 + dice1, ...history.slice(0, 9)],
			})
		});
	}

</script>

<div class='container'>
	{#if $gameState !== kGameStateUnknown}
	<div class='roll-history'>
		{#each $theState.history as rolls, i}
		<div class='historic-roll'>
			<div class:lastroll={i === $theState.history.length-1}>{rolls}</div>
		</div>
		{/each}
	</div>
	<button on:click={rollDice} disabled={$gameState === kGameStateRolling} class:roll-button-shaking={$gameState === kGameStateRolling} class:roll-button-whaa={whaa} class='roll-button'>
		{$gameState === kGameStateRolled ? $theState.dice0 + $theState.dice1 : "???"}
		<div class='dice-view'>
			<div>{$gameState === kGameStateRolled ? $theState.dice0 : "?"}</div>
			<div>|</div>
			<div>{$gameState === kGameStateRolled ? $theState.dice1 : "?"}</div>
		</div>
	</button>
	{/if}
</div>

<svelte:window on:mousedown={() => {
	context.resume();
}}/>


<style>
	.container {
		padding: 0.5em;
		display: flex;
		flex-direction: column;
		user-select: none;
		-webkit-user-select: none;
		height: 100%;
	}
	.lastroll {
		color: var(--maize);
	}

	@keyframes shake {
		0% { transform: translate(1px, 1px) rotate(0deg); }
		10% { transform: translate(-1px, -2px) rotate(-1deg); }
		20% { transform: translate(-3px, 0px) rotate(1deg); }
		30% { transform: translate(3px, 2px) rotate(0deg); }
		40% { transform: translate(1px, -1px) rotate(1deg); }
		50% { transform: translate(-1px, 2px) rotate(-1deg); }
		60% { transform: translate(-3px, 1px) rotate(0deg); }
		70% { transform: translate(3px, 1px) rotate(-1deg); }
		80% { transform: translate(-1px, -1px) rotate(1deg); }
		90% { transform: translate(1px, 2px) rotate(0deg); }
		100% { transform: translate(1px, -2px) rotate(-1deg); }
	}

	@keyframes whaa {
		0% { transform: scale(50%); }
		100% { transform: scale(100%);  }
	}

	.roll-button-shaking {
		animation: shake 0.5s;
		animation-iteration-count: infinite;
	}

.roll-button-whaa {
	animation: whaa 0.15s;
	animation-iteration-count: 9;
}

	.roll-button {
		box-sizing: border-box;
		height: 100%;
		
	}

	.roll-history {
		display: flex;
		flex-direction: row-reverse;
		flex-wrap: none;
		justify-content: space-between;
		color: var(--field-drab)
	}

	.historic-roll {
		display: flex;
		flex-direction: row;
		font-size: 1em;
		margin: 0.5em;
	}

	.dice-view {
		display: grid;
		justify-content: center;
		gap: 0.5em;
		grid-template-columns: auto auto auto;
		font-size: 0.5em;
	}
</style>