// Initialize Firebase
var config = {
apiKey: "AIzaSyCXa_MYi4bhgkTMbwOtNxeiQJCAE7mqp1k",
authDomain: "rps-multiplayer-644b1.firebaseapp.com",
databaseURL: "https://rps-multiplayer-644b1.firebaseio.com",
projectId: "rps-multiplayer-644b1",
storageBucket: "",
messagingSenderId: "602232229140"
};
firebase.initializeApp(config);

var database = firebase.database();

// Only needed for initial push to Firebase
var p1 = {name:"",wins:0,losses:0,ties:0,move:null};
var p2 = {name:"",wins:0,losses:0,ties:0,move:null};
// Global variables
// var p1_move;
// var p2_move;
var currentTurn = 1;
// In case a player value is already stored for current session
sessionStorage.removeItem("player");

// If player values exist in Firebase, pull the values now
database.ref("/players").once("value",function(snapshot){
	console.log("Initial: ",snapshot.val());
	if (snapshot.child("1").exists()) {
		p1 = snapshot.child("1").val();
		console.log("Pulled " + JSON.stringify(p1));
	};
	if (snapshot.child("2").exists()) {
		p2 = snapshot.child("2").val();
		console.log("Pulled " + JSON.stringify(p2));
	};
	// If two players present, block new entry
	if (snapshot.child("1").exists() && snapshot.child("2").exists()) {
		$("#nameEntry").text("Game in progress!")
		$("form").hide();
		sessionStorage.setItem("player","spec");
	};
});

// Reset players
function resetPlayers() {
	// p1 = {name:"",wins:0,losses:0,ties:0};
	// p2 = {name:"",wins:0,losses:0,ties:0};
	p1 = null
	p2 = null
	database.ref().set({
		turn: 0
	});
	// // database.ref("/players/1").remove();
	// // database.ref("/players/2").remove();
	sessionStorage.removeItem("player");
};


// Players enter name, saves player number in session storage
// Push child with name and score 0
$("#submit").on("click",function(e){
	e.preventDefault();
	if (p1.name === "") {
		p1.name = $("#newPlayer").val().trim();
		console.log("P1: ",p1.name);
		// Set session as player 1
		sessionStorage.setItem("player","p1");
		// Display player number and disable name entry
		// $("#nameEntry").prepend("Hi " + p1.name + ". You are Player 1");
		$("form").hide();
		// Push player 1 info to Firebase
		database.ref("/players/1").set(p1);

	} else {
		p2.name = $("#newPlayer").val().trim();
		console.log("P2: ",p2.name);
		sessionStorage.setItem("player","p2");
		// Display player number and disable name entry
		// $("#nameEntry").prepend("Hi " + p2.name + ". You are Player 2");
		$("form").hide();
		// Push player 2 info to Firebase
		database.ref("/players/2").set(p2);

	};
	// This is necessary because of the lag retrieving from Firebase and Javascript being asyncronous
	database.ref("/players").once("value",function(snapshot){
		if (sessionStorage.player === "p1") {
			$("#nameEntry").prepend("Hi " + snapshot.child("1").val().name + ". You are Player 1");
		} else {
			$("#nameEntry").prepend("Hi " + snapshot.child("2").val().name + ". You are Player 2");
		}
	});

});

// Update player names and scores at initialization and every time a player is added
database.ref("/players").on("child_added",function(snapshot){
	function updateWL(player) {
		if (player === "p1") {
			$("#p1_wins").text(snapshot.val().wins);
			$("#p1_losses").text(snapshot.val().losses);
		} else {
			$("#p2_wins").text(snapshot.val().wins);
			$("#p2_losses").text(snapshot.val().losses);
		};
	};
	console.log("Child added: ", snapshot.val());
	if (snapshot.key === "1") {
		$("#p1_name").text(snapshot.val().name);
		updateWL("p1");
		$("#p1_score").show();
		p1 = snapshot.val();
	} else {
		$("#p2_name").text(snapshot.val().name);
		updateWL("p2");
		$("#p2_score").show();
		p2 = snapshot.val();
		// If two other players have joined, become spectator
		if ($("form").is(":visible")) {
			$("#nameEntry").text("Game in progress!")
			$("form").hide();
			sessionStorage.setItem("player","spec");
		};
		// Run game
		run();
		};
	// $("#results").text(compare(p1_move,p2_move));
	});

// Listen to turn changes
database.ref().on("child_changed",function(snapshot){
	console.log("child changed",snapshot.val())
	if (snapshot.key === "turn") {
		// Pull new turn
		currentTurn = snapshot.val();
		console.log("Current turn: ", currentTurn)
		if (currentTurn === 1) {
			turn1();
		} else if (currentTurn === 2) {
			turn2();
		} else if (currentTurn ===3) {
			turn3();
		} else {
			console.log("Stay turn 0")
		}
		console.log("Turn change!")		
	};
});



// Listen to move changes
database.ref("/players/1/").on('child_added' || 'child_changed',function(snapshot){
	if (snapshot.key === "move") {
		console.log("P1 Move: " + snapshot.val());
		p1.move = snapshot.val();
		$("#p1_showMove").text(p1.move);
		$("#p1_showMove").show();
	};
});

database.ref("/players/2/").on('child_added' || 'child_changed',function(snapshot){
	debugger
	if (snapshot.key === "move") {
		console.log("P2 Move: " + snapshot.val());
		p2.move = snapshot.val()
		$("#p2_showMove").text(p2.move);
		$("#p2_showMove").show();
	};
});

// Listen to win/loss changes
database.ref("/players/1").on("child_changed",function(snapshot){
	console.log("Player 1 child changed")
	if (snapshot.key === "wins") {
		p1.wins = snapshot.val();
		$("#p1_wins").text(snapshot.val());		
	} else if (snapshot.key === "ties") {
		p1.ties = snapshot.val()
		$("#p1_ties").text(snapshot.val());		
	} else if (snapshot.key === "losses") {
		p1.losses = snapshot.val();
		$("#p1_losses").text(snapshot.val());		
	}
});

database.ref("/players/2").on("child_changed",function(snapshot){
	if (snapshot.key === "wins") {
		p2.wins = snapshot.val();
		$("#p2_wins").text(snapshot.val());		
	} else if (snapshot.key === "ties") {
		p2.ties = snapshot.val()
		$("#p2_ties").text(snapshot.val());		
	} else if (snapshot.key === "losses") {
		p2.losses = snapshot.val();
		$("#p2_losses").text(snapshot.val());
	}
});



function turn1() {
	// Common displays
	$("#p1_turn").text("It's your turn!");
	$("#p2_turn").text("Waiting for " + p1.name + " to choose.");
	$("#p1_box").css("border-color","lightgreen");
	$("#p2_box").css("border-color","gray");
	$("#p1_choice").hide();
	$("#p2_choice").hide();
	// Player-specific displays
	if (sessionStorage.player === "p1") {
		$("#p1_choice").show();
		$("#p1_turn").show();
	} else {
		$("#p2_turn").show();
	}
};

function turn2() {
	// Common displays
	$("#p1_turn").text("Waiting for " + p2.name + " to choose.");		
	$("#p2_turn").text("It's your turn!");
	$("#p1_box").css("border-color","gray");		
	$("#p2_box").css("border-color","lightgreen");
	$("#p1_choice").hide();
	$("#p2_choice").hide();
	// Player-specific displays
	if (sessionStorage.player === "p1") {
		$("#p1_turn").show();
	} else {
		$("#p2_choice").show();
		$("#p2_turn").show();
	}
};

function turn3() {
	// Determine result
	var result = compare(p1.move, p2.move);
	console.log("Turn 3",result)
	if (result === "p1_winner") {
		$("#result").text(p1.name + " Wins!");
		database.ref("/players").update({
			"1/wins": p1.wins + 1,
			"2/losses": p2.losses + 1
		});
	} else if (result === "p2_winner"){
		$("#result").text(p2.name + " Wins!");
		database.ref("/players").update({
			"1/losses": p1.losses + 1,
			"2/wins": p2.wins + 1
		});
	} else {
		$("#result").text("Tie!");
		database.ref("/players").update({
			"1/ties": p1.ties + 1,
			"2/ties": p2.ties + 1
		});
	}
	function resetTurn() {
		debugger
		database.ref().update({
			turn: 1
		})
	};

	setTimeout(resetTurn,3000);

	database.ref("/players").update({
		"1/move": null,
		"2/move": null
	});
	p1.move = null;
	p2.move = null;

	// Common displays
	$("#result").show();
	// Player-specific displays
	$("#p2_choice").hide();	

	// Play again
	setTimeout(run,3000);
};

// Returns who wins
function compare(m1,m2) {
	if (m1 === m2) {
		return "tie";
	} else if (
		(m1 === "Rock" && m2 === "Scissors") || 
		(m1 === "Paper" && m2 === "Rock") || 
		(m1 === "Scissors" && m2 === "Paper")){
		return "p1_winner"
	} else {
		return "p2_winner"
	};
};

$(".move").on("click",function(){
	// On click push choice to player 1
	if (currentTurn === 1) {
		database.ref("/players/1").update({
			move: $(this).text()
		});
		database.ref().update({
			turn: 2
		});
	} else {
		database.ref("/players/2").update({
			move: $(this).text()
		});
		database.ref().update({
			turn: 3
		});
		// Determine outcome
	}
});

function run() {
	console.log("RUN!")
	// database.ref().update({
	// 		turn: 1
	// 	});
	$(".showMove").hide();
	$("#result").hide();


	// Start game with turn 1
	turn1();
	
};




// On click push choice to player 1


// On click push choice to player 2

// Pull choices with on("value") 


// Calculate who wins and display result in middle

// Push wins/losses 




