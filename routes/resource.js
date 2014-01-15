"use strict";

var db = require('../models');

var request = require('request');

var getAccessToken = function(req) {
  var accessToken = null;

  var auth = req.headers.authorization;

  if (auth) {
    var match = auth.match(/^Bearer (\S+)$/);
    if (match) {
      accessToken = match[1];
    }
  }

  return accessToken;
};

module.exports = function(app, authorizationProvider) {
  var logger = app.get('logger');

  app.get('/resource', function(req, res) {
    var accessToken = getAccessToken(req);

    if (!accessToken) {
      res.json(400, { error: 'invalid_request' });
      return;
    }

    authorizationProvider.isAuthorized(accessToken, function(err, authorized) {
      if (err) {
        logger.error(err);
        res.send(500);
      }
      else if (authorized) {
        res.send('Hello world!');
      }
      else {
        res.json(401, { error: 'unauthorized' });
      }
    });
  });
};
