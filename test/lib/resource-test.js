"use strict";

var app = require('../../lib/app');
var db  = require('../../models');

var nock = require('nock');

var clearDatabase = function(done) {
  db.sequelize.query('DELETE FROM Users').then(function() {
    return db.sequelize.query('DELETE FROM Clients');
  })
  .then(function() {
    done();
  },
  function(error) {
    done(error);
  });
};

var createClient = function(id, userId, done) {
  db.Client.create({ id: id, user_id: userId })
    .complete(function(err, client) {
      done(err);
    });
};

var createUser = function(id, done) {
  db.User.create({ id: id })
    .complete(function(err, user) {
      done(err);
    });
};

var sendRequest = function(context, opts, done) {
  var req = request(app).get('/resource');

  if (opts.accessToken) {
    var tokenType = opts.tokenType || 'Bearer';

    req.set('Authorization', tokenType + ' ' + opts.accessToken);
  }

  req.end(function(err, res) {
    context.res = res;
    done(err);
  });
};

var verifyError = function(res, error) {
  expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
  expect(res.body).to.be.an('object');
  expect(res.body).to.have.property('error');
  expect(res.body.error).to.equal(error);
};

describe("Accessing a protected resource", function() {
  context("with a valid access token", function() {
    context("with no existing client or user in the database", function() {
      before(clearDatabase);

      before(function(done) {
        var config = app.get('config');

        nock(config.uris.authorization_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 12 });

        sendRequest(this, { accessToken: '123abc' }, done);
      });

      it("should return status 200", function() {
        expect(this.res.statusCode).to.equal(200);
      });

      // jshint expr:true
      it("should return JSON", function() {
        expect(this.res.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(this.res.body).to.be.ok;
      });

      it("should return the protected resource", function() {
        expect(this.res.body).to.deep.equal({
          message: app.get('config').service_provider_name + ' says : Hello world!'
        });
      });

      describe("the database", function() {
        before(function(done) {
          var self = this;

          db.Client.findAll()
            .then(function(clients) {
              self.clients = clients;
              return db.User.findAll();
            })
            .then(function(users) {
              self.users = users;
              done();
            },
            function(error) {
              done(error);
            });
        });

        // jshint expr:true
        it("should contain a new client record", function() {
          expect(this.clients).to.be.ok;
          expect(this.clients.length).to.equal(1);
          expect(this.clients[0].id).to.equal(11);
        });

        // jshint expr:true
        it("should contain a new user record", function() {
          expect(this.users).to.be.ok;
          expect(this.users.length).to.equal(1);
          expect(this.users[0].id).to.equal(12);
        });

        describe("the client", function() {
          it("should be associated with the user", function() {
            expect(this.clients[0].user_id).to.equal(12);
          });
        });
      });
    });

    context("with an existing client and user in the database", function() {
      before(clearDatabase);
      before(function(done) { createUser(12, done); });
      before(function(done) { createClient(11, 12, done); });

      before(function(done) {
        var config = app.get('config');

        nock(config.uris.authorization_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 12 });

        sendRequest(this, { accessToken: '123abc' }, done);
      });

      it("should return status 200", function() {
        expect(this.res.statusCode).to.equal(200);
      });

      // jshint expr:true
      it("should return JSON", function() {
        expect(this.res.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(this.res.body).to.be.ok;
      });

      it("should return the protected resource", function() {
        expect(this.res.body).to.deep.equal({
          message: app.get('config').service_provider_name + ' says : Hello world!'
        });
      });

      describe("the database", function() {
        before(function(done) {
          var self = this;

          db.Client.findAll()
            .then(function(clients) {
              self.clients = clients;
              return db.User.findAll();
            })
            .then(function(users) {
              self.users = users;
              done();
            },
            function(error) {
              done(error);
            });
        });

        // jshint expr:true
        it("should contain a single client record", function() {
          expect(this.clients).to.be.ok;
          expect(this.clients.length).to.equal(1);
          expect(this.clients[0].id).to.equal(11);
        });

        // jshint expr:true
        it("should contain a single user record", function() {
          expect(this.users).to.be.ok;
          expect(this.users.length).to.equal(1);
          expect(this.users[0].id).to.equal(12);
        });

        describe("the client", function() {
          it("should be associated with the user", function() {
            expect(this.clients[0].user_id).to.equal(12);
          });
        });
      });
    });

    context("with an existing client in the database, not associated with a user", function() {
      before(clearDatabase);
      before(function(done) { createClient(11, null, done); });

      before(function(done) {
        var config = app.get('config');

        nock(config.uris.authorization_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 13 });

        sendRequest(this, { accessToken: '123abc' }, done);
      });

      it("should return status 200", function() {
        expect(this.res.statusCode).to.equal(200);
      });

      // jshint expr:true
      it("should return JSON", function() {
        expect(this.res.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(this.res.body).to.be.ok;
      });

      it("should return the protected resource", function() {
        expect(this.res.body).to.deep.equal({
          message: app.get('config').service_provider_name + ' says : Hello world!'
        });
      });

      describe("the database", function() {
        before(function(done) {
          var self = this;

          db.Client.findAll()
            .then(function(clients) {
              self.clients = clients;
              return db.User.findAll();
            })
            .then(function(users) {
              self.users = users;
              done();
            },
            function(error) {
              done(error);
            });
        });

        // jshint expr:true
        it("should contain a single client record", function() {
          expect(this.clients).to.be.ok;
          expect(this.clients.length).to.equal(1);
          expect(this.clients[0].id).to.equal(11);
        });

        // jshint expr:true
        it("should contain a new user record", function() {
          expect(this.users).to.be.ok;
          expect(this.users.length).to.equal(1);
          expect(this.users[0].id).to.equal(13);
        });

        describe("the client", function() {
          it("should be associated with the user", function() {
            expect(this.clients[0].user_id).to.equal(13);
          });
        });
      });
    });

    context("with an existing client in the database, associated with a different user", function() {
      before(clearDatabase);
      before(function(done) { createUser(12, done); });
      before(function(done) { createClient(11, 12, done); });

      before(function(done) {
        var config = app.get('config');

        nock(config.uris.authorization_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 13 });

        sendRequest(this, { accessToken: '123abc' }, done);
      });

      it("should return status 200", function() {
        expect(this.res.statusCode).to.equal(200);
      });

      // jshint expr:true
      it("should return JSON", function() {
        expect(this.res.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(this.res.body).to.be.ok;
      });

      it("should return the protected resource", function() {
        expect(this.res.body).to.deep.equal({
          message: app.get('config').service_provider_name + ' says : Hello world!'
        });
      });

      describe("the database", function() {
        before(function(done) {
          var self = this;

          db.Client.findAll()
            .then(function(clients) {
              self.clients = clients;
              return db.User.findAll();
            })
            .then(function(users) {
              self.users = users;
              done();
            },
            function(error) {
              done(error);
            });
        });

        // jshint expr:true
        it("should contain a single client record", function() {
          expect(this.clients).to.be.ok;
          expect(this.clients.length).to.equal(1);
          expect(this.clients[0].id).to.equal(11);
        });

        // jshint expr:true
        it("should contain a new user record", function() {
          expect(this.users).to.be.ok;
          expect(this.users.length).to.equal(2);
          expect(this.users[0].id).to.equal(12);
          expect(this.users[1].id).to.equal(13);
        });

        describe("the client", function() {
          it("should be associated with the new user", function() {
            expect(this.clients[0].user_id).to.equal(13);
          });
        });
      });
    });
  });

  context("with no authorization header", function() {
    before(function(done) {
      sendRequest(this, { accessToken: null }, done);
    });

    it("should return status 401", function() {
      expect(this.res.statusCode).to.equal(401);
    });

    it("should return an 'unauthorized' error", function() {
      verifyError(this.res, 'unauthorized');
    });
  });

  context("with an invalid access token", function() {
    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(401);

      sendRequest(this, { accessToken: 'abc123' }, done);
    });

    it("should return status 401", function() {
      expect(this.res.statusCode).to.equal(401);
    });

    it("should return an unauthorized error", function() {
      verifyError(this.res, 'unauthorized');
    });

    describe("the response body", function() {
      it("should include the authorization uri", function() {
        expect(this.res.body).to.have.property('authorization_uri');
        expect(this.res.body.authorization_uri).to.equal('http://ap.example.com');
      });

      it("should include the service provider id", function() {
        expect(this.res.body).to.have.property('service_provider_id');
        expect(this.res.body.service_provider_id).to.equal('1');
      });
    });
  });

  context("with an incorrect token type", function() {
    before(function(done) {
      sendRequest(this, { accessToken: 'abc123', tokenType: 'Basic' }, done);
    });

    it("should return status 400", function() {
      expect(this.res.statusCode).to.equal(400);
    });

    it("should return an invalid_request error", function() {
      verifyError(this.res, 'invalid_request');
    });
  });

  context("when the authorization server fails", function() {
    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(500);

      sendRequest(this, { accessToken: 'abc123' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });
});
