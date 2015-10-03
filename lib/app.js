"use strict";

// Module dependencies
var express = require('express');
require('express-namespace');

var path = require('path');

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

app.set('logger', logger);

if (process.env.NODE_ENV !== "test") {
  var stream = {
    write: function(message, encoding) {
      return logger.info(message.trimRight());
    }
  };

  app.use(express.logger({ stream: stream, format: 'dev' }));
}

app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());

// Routes
var urlPrefix = config.urlPrefix || '';

app.use(urlPrefix, express.static(path.join(__dirname, '..', 'public')));

app.use(require('./url-prefix')(urlPrefix));

app.use(app.router);

app.namespace(urlPrefix, function() {
  require('../routes/status')(app);
  require('../routes/resource')(app);
  require('../routes/index')(app);
  require('../routes/tags')(app);
});

if (app.get('env') !== 'test') {
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
