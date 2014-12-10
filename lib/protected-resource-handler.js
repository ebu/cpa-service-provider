"use strict";

var async   = require('async');
var request = require('request');

/**
 * Returns an Express middleware function that verifies an access token with
 * the authorization provider.
 */

module.exports = function(config, db, logger) {

  /**
   * Returns the access token in the HTTP request, or null if no access token
   * is present.
   *
   * @see EBU Tech 3366, section 7.7.2
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
   *
   * @see EBU Tech 3366, section 9.2
   */

  var checkIsAuthorized = function(accessToken, callback) {
    var requestBody = {
      access_token: accessToken,
      domain:       config.service_provider.domain
    };

    var requestOptions = {
      uri:  config.authorization_provider.authorization_uri,
      headers: {
        "Content-type":  "application/json",
        "Authorization": "Bearer " + config.authorization_provider.access_token
      },
      body: JSON.stringify(requestBody)
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
          clientId:        data.client_id,
          userId:          data.user_id,
          userDisplayName: data.display_name
        };

        callback(null, clientInfo);
      }
      else if (response.statusCode === 404) {
        // The access token is unknown or has expired (or we've requested the
        // wrong endpoint).
        callback(null, null);
      }
      else {
        error = new Error("Error from authorization provider");
        error.statusCode = response.statusCode;

        callback(error);
      }
    });
  };

  var quote = function(string) {
    return '"' + string + '"';
  };

  var header = function(key, value) {
    return key + "=" + quote(value);
  };

  /**
   * Add a WWW-Authenticate header to the response that indicates the url of
   * the authorization provider.
   *
   * @see EBU Tech 3366, section 7.7.2
   */

  var setWwwAuthenticateHeader = function(res, includeClientMode) {
    var modes;

    if (includeClientMode) {
      modes = config.authorization_provider.modes;
    }
    else {
      modes = config.authorization_provider.modes.filter(function(mode) {
        return mode !== 'client';
      });
    }

    if (modes.length > 0) {
      var headerValue = "CPA " + [
        header("version", "1.0"),
        header("name", config.authorization_provider.name),
        header("uri", config.authorization_provider.base_uri),
        header("modes", modes.join(","))
      ].join(" ");

      res.set('WWW-Authenticate', headerValue);
    }
  };

  var sendUnauthorizedResponse = function(res, includeClientMode) {
    setWwwAuthenticateHeader(res, true);
    res.send(401, "");
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

        if (user.display_name !== state.clientInfo.userDisplayName) {
          user.display_name = state.clientInfo.userDisplayName;

          user.save().complete(function(err) {
            if (err) {
              callback(err);
              return;
            }

            state.user = user;
            callback(null, state);
          });
        }
        else {
          state.user = user;
          callback(null, state);
        }
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

  /**
   * Express middleware function that verifies an access token with the
   * authorization provider. If the token is not valid, an error response is
   * returned. If the token is valid, this function adds client (device) and
   * user information to the request, for use in subsequent request handler
   * functions.
   */

  var protectedResourceHandler = function(req, res, next) {
    var accessToken = null;

    if (req.headers.authorization) {
      accessToken = getAccessToken(req);

      if (!accessToken) {
        res.json(400, {
          error: 'invalid_request',
          error_description: "Missing access token"
        });

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
        next(err);
        return;
      }

      if (!clientInfo) {
        sendUnauthorizedResponse(res);
        return;
      }

      // Create client and/or user entries in the database.
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

            if (!state.user) {
              // Send a WWW-Authenticate header in the HTTP response if this
              // client can elevate from client mode to user mode
              setWwwAuthenticateHeader(res, false);
            }

            next();
          }
        ],
        function(error) {
          if (error) {
            transaction.rollback().complete(function() {
              next(error);
            });
          }
        });
      });
    });
  };

  return protectedResourceHandler;
};
