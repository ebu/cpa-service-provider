"use strict";

var request = require('request');

module.exports = function(config, db, logger) {

  /**
   * Returns the access token in the HTTP request.
   */

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

  /**
   * Verifies the given access token with the authorization provider.
   */

  var checkIsAuthorized = function(accessToken, callback) {
    var requestOptions = {
      uri:  config.uris.authorization_uri,
      form: { token: accessToken }
    };

    request.post(requestOptions, function(error, response, body) {
      if (error) {
        logger.error(error);
        callback(error);
        return;
      }

      if (response.statusCode >= 200 && response.statusCode <= 299) {
        var data = JSON.parse(body);

        var result = {
          clientId: data.client_id,
          userId:   data.user_id
        };

        callback(null, result);
      }
      else if (response.statusCode === 401) {
        callback(null, null);
      }
      else {
        error = new Error("Error from authorization provider");
        error.statusCode = response.statusCode;

        logger.error(error);
        callback(error);
      }
    });
  };

  var sendUnauthorizedResponse = function(res) {
    res.json(401, {
      error: 'unauthorized',
      authorization_uri: config.uris.authorization_uri,
      service_provider_id: config.service_provider_id
    });
  };

  var createClient = function(user, clientId, callback) {
    if (!clientId) {
      var error = new Error("invalid clientId");
      error.statusCode = 400;

      callback(error);
      return;
    }

    db.Client
      .findOrCreate({ id: clientId })
      .complete(function(err, client) {
        if (err) {
          callback(err);
          return;
        }

        if (user && client.user_id !== user.id) {
          client.user_id = user.id;

          client.save().complete(function(err) {
            if (err) {
              callback(err);
              return;
            }

            callback(null, client, user);
          });
        }
        else {
          callback(null, client, user);
        }
      });
  };

  var createUserAndClient = function(userId, clientId, callback) {
    if (userId) {
      db.User
        .findOrCreate({ id: userId })
        .complete(function(err, user) {
          if (err) {
            callback(err);
            return;
          }

          createClient(user, clientId, callback);
        });
    }
    else {
      createClient(null, clientId, callback);
    }
  };

  var protectedResourceHandler = function(req, res, next) {
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

    checkIsAuthorized(accessToken, function(err, user) {
      if (err) {
        logger.error(err);
        res.send(500);
        return;
      }

      if (!user) {
        sendUnauthorizedResponse(res);
        return;
      }

      // Create client and/or user entries in the database, then set req.device
      // for the next handler function.

      createUserAndClient(user.userId, user.clientId, function(err, client, user) {
        if (err) {
          res.send(500);
          return;
        }

        // Use req.device as req.client contains the HTTP client for this
        // request
        req.device = client;
        // req.user   = user;
        next();
      });
    });
  };

  return protectedResourceHandler;
};
