//Require Express.js and minimist
const express = require('express')
const app = express()
const morgan = require('morgan')
const fs = require('fs')
const minimist = require('minimist')
const args = minimist(process.argv.slice(2))

//Require database SCRIPT file
const db = require("./database.js")

//Make Express use its own built-in body parser for both urlencoded and JSON body data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Port variable
args['port']
const port = args.port || process.env.PORT || 5000

//Store help text
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)

// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
  console.log(help)
  process.exit(0)
}

//Start an app server
const server = app.listen(port, () => {
    console.log(`App is running on port ${port}`)
})

app.use(morgan('tiny'))

app.get('/app/flip', (req, res) => {
    var flip = coinFlip()
    res.type('text/plain')
    res.status(200).json({ 'flip' : flip })
})

app.get('/app/flip/call/heads', (req, res) => {
    var heads = flipACoin('heads')
    res.type('text/plain')
    res.status(200).json({ 'call' : heads.call, 'flip' : heads.flip, 'result' : heads.result })
})

app.get('/app/flip/call/tails', (req, res) => {
    var tails = flipACoin('tails')
    res.type('text/plain')
    res.status(200).json({ 'call' : tails.call, 'flip' : tails.flip, 'result' : tails.result })
})

app.get('/app/flips/:number', (req, res) => {
    var coinFlipsResult = coinFlips(req.params.number)
    var countFlipsResult = countFlips(coinFlips)
    res.type('text/plain')
    res.status(200).json({ 'raw' : coinFlipsResult, 'summary' : countFlipsResult })
})

//Check endpoint
app.get('/app', (req, res, next) => {
  res.json({"message":"Your API works! (200)"});
  res.status(200);
})

// Define other CRUD API endpoints using express.js and better-sqlite3
// CREATE a new user (HTTP method POST) at endpoint /app/new/
app.post("/app/new/user", (req, res, next) => {
  let data = {
      user: req.body.username,
      pass: req.body.password
  }
  const stmt = db.prepare('INSERT INTO userinfo (username, password) VALUES (?, ?)')
  const info = stmt.run(data.user, data.pass)
  res.status(200).json(info)
})

// READ a list of users (HTTP method GET) at endpoint /app/users/
app.get("/app/users", (req, res) => {	
  try {
      const stmt = db.prepare('SELECT * FROM userinfo').all()
      res.status(200).json(stmt)
  } catch {
      console.error(e)
  }
})

// READ a single user (HTTP method GET) at endpoint /app/user/:id
app.get("/app/user/:id", (req, res) => {
  try {
      const stmt = db.prepare('SELECT * FROM userinfo WHERE id = ?').get(req.params.id);
      res.status(200).json(stmt)
  } catch (e) {
      console.error(e)
  }

})

// UPDATE a single user (HTTP method PATCH) at endpoint /app/update/user/:id
app.patch("/app/update/user/:id", (req, res) => {
  let data = {
      user: req.body.username,
      pass: req.body.password
  }
  const stmt = db.prepare('UPDATE userinfo SET username = COALESCE(?,username), password = COALESCE(?,password) WHERE id = ?')
  const info = stmt.run(data.user, data.pass, req.params.id)
  res.status(200).json(info)
})

// DELETE a single user (HTTP method DELETE) at endpoint /app/delete/user/:id
app.delete("/app/delete/user/:id", (req, res) => {
  const stmt = db.prepare('DELETE FROM userinfo WHERE id = ?')
  const info = stmt.run(req.params.id)
  res.status(200).json(info)
})

//Default response for any other request (default endpoint)
app.use(function(req, res){
	res.json({"message":"Endpoint not found. (404)"});
    res.status(404);
})

process.on('SIGTERM', () => {
  server.close(() => {
      console.log('Server stopped')
  })
})

//Functions used for flipping the coin
function coinFlip() {
  return Math.random() > .5 ? ("heads") : ("tails");
}

function coinFlips(flips) {
  const results = [];
  for (let i = 0; i < flips; i++) {
    results[i] = coinFlip();
  }
  return results;
}

function countFlips(array) {
  let results = {heads: 0, tails: 0};
  for (let i = 0; i < array.length; i++) {
    if (array[i] == "heads") {
      results.heads = results.heads + 1;
    }
    if (array[i] == "tails") {
      results.tails = results.tails + 1;
    }
  }
  return results;
}

function flipACoin(call) {
  let flip = coinFlip();
  let result = "lose";
  if (call == flip) {
    result = "win";
  }
  return {call: call, flip: flip, result: result};
}