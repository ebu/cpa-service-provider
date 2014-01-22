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
  var config = app.get('config');

  var sendUnauthorizedResponse = function(res) {
    res.json(401, {
      error: 'unauthorized',
      authorization_uri: config.uris.authorization_uri,
      service_provider_id: config.service_provider_id
    });
  };

  app.get('/resource', function(req, res) {
    var accessToken = null;

    if (req.headers.authorization) {
      accessToken = getAccessToken(req);

      if (!accessToken) {
        res.json(400, { error: 'invalid_request' });
        return;
      }
    }
    else {
      sendUnauthorizedResponse(res);
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
        sendUnauthorizedResponse(res);
      }
    });
  });
};
