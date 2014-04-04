"use strict";

var async   = require('async');
var request = require('request');

module.exports = function(config, db, logger) {

  /**
   * Returns the access token in the HTTP request, or null if no access token
   * is present.
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
   * Parses an object from a JSON string. Returns the object, or null
   * if the string is not valid JSON.
   */

  var parseJson = function(json) {
    var data = null;

    try {
      data = JSON.parse(json);
    }
    catch (exception) {
      // Ignore
    }

    return data;
  };

  /**
   * Verifies the given access token with the authorization provider.
   */

  var checkIsAuthorized = function(accessToken, callback) {
    var requestOptions = {
      uri:  config.uris.authorization_uri,
      form: {
        token:               accessToken,
        service_provider_id: config.service_provider_id
      }
    };

    request.post(requestOptions, function(error, response, body) {
      if (error) {
        callback(error);
        return;
      }

      if (response.statusCode >= 200 && response.statusCode <= 299) {
        var data = parseJson(body);

        if (!data) {
          callback(new Error("Invalid JSON response"));
          return;
        }

        var clientInfo = {
          clientId: data.client_id,
          userId:   data.user_id
        };

        callback(null, clientInfo);
      }
      else if (response.statusCode === 401) {
        callback(null, null);
      }
      else {
        error = new Error("Error from authorization provider");
        error.statusCode = response.statusCode;

        callback(error);
      }
    });
  };

  var sendUnauthorizedResponse = function(res) {
    res.json(401, {
      error:               'unauthorized',
      authorization_uri:   config.uris.authorization_provider_base_uri,
      service_provider_id: config.service_provider_id
    });
  };

  var createUser = function(state, callback) {
    var userId = state.clientInfo.userId;

    if (!userId) {
      callback(null, state);
      return;
    }

    db.User
      .findOrCreate({ id: userId })
      .complete(function(err, user) {
        if (err) {
          callback(err);
          return;
        }

        state.user = user;
        callback(null, state);
      });
  };

  var createClient = function(state, callback) {
    var clientId = state.clientInfo.clientId;

    if (!clientId) {
      callback(new Error("Invalid client_id"));
      return;
    }

    db.Client
      .findOrCreate({ id: clientId })
      .complete(function(err, client) {
        if (err) {
          callback(err);
          return;
        }

        if (state.user && client.user_id !== state.user.id) {
          client.user_id = state.user.id;

          client.save().complete(function(err) {
            if (err) {
              callback(err);
              return;
            }

            state.client = client;
            callback(null, state);
          });
        }
        else {
          state.client = client;
          callback(null, state);
        }
      });
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

    checkIsAuthorized(accessToken, function(err, clientInfo) {
      if (err) {
        // Querying the Authorization Provider failed.
        logger.error(err);
        res.send(500);
        return;
      }

      if (!clientInfo) {
        sendUnauthorizedResponse(res);
        return;
      }

      // Create client and/or user entries in the database, then set req.device
      // for the next handler function.

      db.sequelize.transaction(function(transaction) {
        async.waterfall([
          function(callback) {
            var state = { clientInfo: clientInfo };
            createUser(state, callback);
          },
          createClient,
          function(state, callback) {
            transaction.commit().complete(function(err) {
              callback(err, state);
            });
          },
          function(state, callback) {
            // Use req.device as req.client contains the HTTP client for this
            // request
            req.device = state.client;
            req.user   = state.user;
            next();
          }
        ],
        function(error) {
          if (error) {
            transaction.rollback().complete(function(err) {
              res.send(500);
            });
          }
        });
      });
    });
  };

  return protectedResourceHandler;
};
