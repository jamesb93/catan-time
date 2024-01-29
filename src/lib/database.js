import { initializeApp } from "firebase/app";
import { getDatabase, set, ref, onValue } from "firebase/database";

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
export const database = getDatabase(app);
