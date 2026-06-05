// Week 5 - Extra Question 1 - server.js
// -------------------------------------

const express = require('express');
const server = express();

const hostname = 'localhost';
const port = 8000;

server.set("view engine", "ejs");

// START YOUR CODE HERE
const path = require(`path`)
server.use(express.static(__dirname))

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

