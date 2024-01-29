<script>

	import { getDatabase,set, ref, onValue, get } from "firebase/database";
	import { onMount } from 'svelte';
	import { cyrb128, sfc32 } from '$lib/rng'
	import { writable } from 'svelte/store';
	import { database } from '$lib/database';

	let context;
	let sevenAudioBuffer, diceAudioBuffer;
	let shaking = false;

	$: totalRoll = $theState ? $theState.dice0 + $theState.dice1 : 0;
	$: whaa = $gameState === kGameStateRolled && totalRoll === 7;

	let maxRoll = 6
	let rollHistory = Array.from({length: 10}, () => 0);
	let analysisStorage = Array.from({length: 11}, () => 0);

	function writeRoll(rollAmount, dice0, dice1) {
		const db = getDatabase();
		set(ref(db, 'roll'), rollAmount);
		set(ref(db, 'dice'), {
			dice0: dice0,
			dice1: dice1
		});
		set(ref(db, 'rollHistory'), rollHistory);
	}

	function finishRoll() {
		shaking = false;
	}

	function rollDice(e) {		
		e.preventDefault()

		const seed = cyrb128(Date.now().toString());
		const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
		const dice0 = Math.floor(rand() * maxRoll) + 1
		const dice1 = Math.floor(rand() * maxRoll) + 1

		setRoll(dice0, dice1);
	}

	onMount(async() => {
		context = new AudioContext();

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

	export const gameState = writable(kGameStateUnknown)
	export const theState = writable({
		dice0: 0,
		dice1: 0,
		timestamp: 0,
		history: Array.from({length: 10}, () => 0),
	})

	export const audioCompensation = writable(0)

	// Listeners
	onValue(ref(database, 'state'), (snapshot) => {
		const {timestamp} = snapshot.val();
		const offset = timestamp - Date.now();
		gameState.set(kGameStateRolling)
		
		if (offset > 0) {
			audioCompensation.set(offset)
		}

		const buffer = $gameState === kGameStateRolling ? diceAudioBuffer : whaa ? sevenAudioBuffer : null;
		console.log($gameState, buffer)
		if (buffer) {			
			const node = context.createBufferSource();
			node.buffer = buffer;
			
			node.connect(context.destination);
			node.start(context.currentTime + $audioCompensation)
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
				timestamp: Date.now() + 1000,
				history: [dice0 + dice1, ...history.slice(0, 9)],
			})
		});
	}

</script>

<div class='container'>
	{#if $gameState !== kGameStateUnknown}
	<div class='roll-history'>
		{#each rollHistory as rolls, i}
		<div class='historic-roll'>
			<div class:lastroll={i === rollHistory.length-1}>{rolls}</div>
		</div>
		{/each}
	</div>
	<button on:click={rollDice} class:roll-button-shaking={$gameState === kGameStateRolling} class:roll-button-whaa={whaa} class='roll-button'>
		{$gameState === kGameStateRolled ? $theState.dice0 + $theState.dice1 : "???"}
		<div class='dice-view'>
			<div>{$gameState === kGameStateRolled ? $theState.dice0 : "?"}</div>
			<div>|</div>
			<div>{$gameState === kGameStateRolled ? $theState.dice1 : "?"}</div>
		</div>
	</button>
	{/if}
</div>


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