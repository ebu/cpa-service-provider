"use strict";

/**
 * Module dependencies.
 */

var express = require('express');
var path    = require('path');

var config = require('../config.js');
var db     = require('../models');

// Server
var app = express();
app.set('port', process.env.PORT || 3000);

// Templates
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Config
app.set('config', config);

// Logging
var logger;

if (process.env.NODE_ENV !== "test") {
  logger = require('./logger');
}
else {
  logger = require('./null-logger');
}

// Set up express web server logging via winston, but don't enable logging
// when running unit tests.

if (process.env.NODE_ENV === "test") {
  var stream = {
    write: function(message, encoding) {
      return logger.info(message.trimRight());
    }
  };

  app.use(express.logger({ stream: stream }));
}

app.set('logger', logger);

app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());

// Helper objects
var AuthorizationProvider = require('./authorization-provider');

var authorizationProvider = new AuthorizationProvider({
  authorizationUri: config.uris.authorization_uri,
  logger: logger
});

// Routes
app.use(app.router);
app.use(express.static(path.join(__dirname, '..', 'public')));

require('../routes/status')(app);
require('../routes/resource')(app, authorizationProvider);
require('../routes/index')(app);

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

db.sequelize
  .authenticate()
  .complete(function(err) {
    if (err) {
      logger.error('Unable to connect to the database.');
    }
    else {
      logger.info('Database connection has been established successfully.');
    }
  });

app.on('listening', function() {
  logger.info('Express server listening on port ' + app.get('port'));
});

module.exports = app;