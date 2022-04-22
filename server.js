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

//Check endpoint
app.get('/app', (req, res, next) => {
  res.json({"message":"Your API works! (200)"});
  res.status(200);
})

//Middleware function that inserts new record in database containing all variables 
app.use( (req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }

  const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)

  next()
})

//If debug is true, the endpoints should be available when server.js is run
if (args.debug  == 'true') {
  //Returns all records in accesslog table in database
  app.get("/app/log/access", (req, res) => {	
    try {
        const stmt = db.prepare('SELECT * FROM accesslog').all()
        res.status(200).json(stmt)
    } catch {
        console.error(e)
    }
  })
  //Returns error in the response
  app.get('/app/error', (req, res) => {
    throw new Error("Error test successful")
  })
}

if (args.log != 'false') {
  // Use morgan for logging to files
  // Create a write stream to append (flags: 'a') to a file
  const write_stream = fs.createWriteStream('access.log', { flags: 'a' })
  // Set up the access logging middleware
  app.use(morgan('combined', { stream: write_stream }))
}

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