<script>

	import { getDatabase,set, ref, onValue } from "firebase/database";
	import { initializeApp } from "firebase/app";
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import { cyrb128, sfc32 } from '$lib/rng'

	const firebaseConfig = {
		apiKey: "AIzaSyDR-7wn0q0_OFrpQN2f8ciojC6n2t0N4Q4",
		authDomain: "catan-time.firebaseapp.com",
		databaseURL: "https://catan-time-default-rtdb.asia-southeast1.firebasedatabase.app",
		projectId: "catan-time",
		storageBucket: "catan-time.appspot.com",
		messagingSenderId: "1076646348235",
		appId: "1:1076646348235:web:616b643ecdb7825031e24e"
	};
	const app = initializeApp(firebaseConfig);
	const database = getDatabase(app);

	let canvas, chart;
	let shaking = false;
	let whaa = false;
	let sevenPlayer;

	let roll = 0
	let dice0 = 0;
	let dice1 = 0;
	let maxRoll = 6

	let rollHistory = Array.from({length: 10}, () => 0);
	let analysisStorage = Array.from({length: 11}, () => 0);

	// Create cyrb128 state:
	const seed = cyrb128(Date.now().toString());
	// Four 32-bit component hashes provide the seed for sfc32.
	const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

	onValue(ref(database, 'roll'), (snapshot) => {
		roll = snapshot.val();
	});

	onValue(ref(database, 'dice'), (snapshot) => {
		try {
			dice0 = snapshot.val().dice0;
			dice1 = snapshot.val().dice1;
		} catch (error) {
			console.log(error)
		}
	});

	onValue(ref(database, 'rollHistory'), (snapshot) => {
		try {
			const value = snapshot.val()
			if (value.length > 0) {
				rollHistory = snapshot.val();
			}
		} catch (error) {
			console.log(error)
		}
	});

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

		dice0 = Math.floor(rand() * maxRoll) + 1
		dice1 = Math.floor(rand() * maxRoll) + 1
		roll = dice0 + dice1
		rollHistory.push(roll)
		rollHistory = rollHistory

		if (roll === 7) {
			sevenPlayer.play()
			whaa = true
			setTimeout(() => {
				whaa = false
			}, 1500)
		}


		if (rollHistory.length > 10) {
			rollHistory.shift()
		}

		analysisStorage.push(roll)
		writeRoll(roll, dice0, dice1)
	}

	function rollDice(e) {
		e.preventDefault()
		if (shaking) {
			return
		}

		shaking = true;
		whaa = false;
		roll = "???";
		dice0 = "?";
		dice1 = "?";
		setTimeout(() => {
			finishRoll()
		}, 1000)
	}


	onMount(async() => {
		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: analysisStorage.map((x, i) => i + 2),
				datasets: [{
					label: 'Rolls',
					backgroundColor: [
						'rgba(255, 99, 132, 0.2)',
						'rgba(255, 159, 64, 0.2)',
						'rgba(255, 205, 86, 0.2)',
						'rgba(75, 192, 192, 0.2)',
						'rgba(54, 162, 235, 0.2)',
						'rgba(153, 102, 255, 0.2)',
						'rgba(201, 203, 207, 0.2)'
						],
						borderColor: [
						'rgb(255, 99, 132)',
						'rgb(255, 159, 64)',
						'rgb(255, 205, 86)',
						'rgb(75, 192, 192)',
						'rgb(54, 162, 235)',
						'rgb(153, 102, 255)',
						'rgb(201, 203, 207)'
					],
					data: analysisStorage,
					borderWidth: 1
				}]
			},
			options: {
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true
					},
				},
				responsive: true,
				plugins: {
					legend: {
						// position: 'top',
					},
					title: {
						display: true,
						text: 'Chart.js Bar Chart'
					}
				}
			},
		})
	})

	function megaroll() {
		const seed = cyrb128(Date.now().toString());
	// Four 32-bit component hashes provide the seed for sfc32.
		const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
		for (var i=0; i < 100; i++) {
			const dice0 = Math.floor(rand() * maxRoll) + 1
			const dice1 = Math.floor(rand() * maxRoll) + 1
			let sum = dice0 + dice1
			let index = sum - 2 // offset by 2
			analysisStorage[index] += 1	
		}
		chart.data.datasets[0].data = analysisStorage
		chart.update()
	}
</script>

<!-- <button on:click={megaroll}>GOGOGOGOGO</button>

<canvas bind:this={canvas}></canvas>

{ analysisStorage } -->

<div class='container'>
	<div class='roll-history'>
		{#each rollHistory as rolls, i}
		<div class='historic-roll'>
			<div class:lastroll={i === rollHistory.length-1}>{rolls}</div>
		</div>
		{/each}
	</div>
	<button on:click={rollDice} class:roll-button-shaking={shaking} class:roll-button-whaa={whaa} class='roll-button'>
		{roll}
		<div class='dice-view'>
			<div>{dice0}</div>
			<div>|</div>
			<div>{dice1}</div>
		</div>
	</button>
</div>

<audio src="/seven.mp3" preload='auto' bind:this={sevenPlayer}>

</audio>

<style>
	canvas {
		width: 400px;
		height: 400px;
		min-width: 400px;
		min-height: 400px;
	}
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
	animation-iteration-count: infinite;
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