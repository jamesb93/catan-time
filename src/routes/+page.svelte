<script>

	import { getDatabase,set, ref, onValue } from "firebase/database";
	import { initializeApp } from "firebase/app";

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

	let roll = 0
	let dice0 = 0;
	let dice1 = 0;
	let maxRoll = 6

	let rollHistory = [];
	let analysisStorage = [];
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

	function rollDice(e) {
		e.preventDefault()
		dice0 = Math.floor(rand() * maxRoll) + 1
		dice1 = Math.floor(rand() * maxRoll) + 1
		roll = dice0 + dice1
		rollHistory.push(roll)
		rollHistory = rollHistory


		if (rollHistory.length > 10) {
			rollHistory.shift()
		}

		analysisStorage.push(roll)
		writeRoll(roll, dice0, dice1)
	}

	function cyrb128(str) {
		let h1 = 1779033703, h2 = 3144134277,
			h3 = 1013904242, h4 = 2773480762;
		for (let i = 0, k; i < str.length; i++) {
			k = str.charCodeAt(i);
			h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
			h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
			h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
			h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
		}
		h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
		h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
		h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
		h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
		h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
		return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
	}

	function sfc32(a, b, c, d) {
		return function() {
		a |= 0; b |= 0; c |= 0; d |= 0; 
		var t = (a + b | 0) + d | 0;
		d = d + 1 | 0;
		a = b ^ b >>> 9;
		b = c + (c << 3) | 0;
		c = (c << 21 | c >>> 11);
		c = c + t | 0;
		return (t >>> 0) / 4294967296;
		}
	}


</script>

<div class='container'>
	<div class='roll-history'>
		{#each rollHistory as rolls, i}
		<div class='historic-roll'>
			<div class:lastroll={i === rollHistory.length-1}>{`${i}: ${rolls}`}</div>
		</div>
		{/each}
	</div>
	<button on:click={rollDice}>
		{roll}
		<div class='dice-view'>
			<div>{dice0}</div>
			<div>|</div>
			<div>{dice1}</div>
		</div>
	</button>
</div>

<style>
	.container {
		display: grid;
		grid-template-columns: 7em auto;
		user-select: none;
		-webkit-user-select: none;
	}
	.lastroll {
		color: red;	
	}
	button {
		font-size: 8em;
		/* no border and flat look; */
		background: none;
		width: 100%;
		height: 100%;
		min-height: 80vh;
	}

	.dice-view {
		display: grid;
		justify-content: center;
		gap: 1.5em;
		grid-template-columns: auto auto auto;
		font-size: 0.5em;
	}

	.roll-history {
		display: flex;
		flex-direction: column;
		flex-wrap: none;
		justify-content: left;
	}

	.historic-roll {
		display: flex;
		flex-direction: row;
		font-size: 2em;
		margin: 0.5em;
	}
</style>