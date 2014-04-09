"use strict";

var app = require('../../lib/app');
var db  = require('../../models');

var assertions    = require('../assertions');
var requestHelper = require('../request-helper');

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

describe("Accessing a protected resource", function() {
  context("with a valid access token", function() {
    context("with no existing client or user in the database", function() {
      before(clearDatabase);

      before(function(done) {
        var config = app.get('config');

        nock(config.authorization_provider.base_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 12 });

        requestHelper.sendRequest(this, '/resource', { accessToken: '123abc', scope: config.service_provider.scope }, done);
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
          message: 'BBC1 says: Hello user 12!'
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

        nock(config.authorization_provider.base_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 12 });

        requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
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
          message: 'BBC1 says: Hello user 12!'
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

        nock(config.authorization_provider.base_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: null });

        requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
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
          message: 'BBC1 says: Hello client 11!'
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

        describe("the client", function() {
          it("should not be associated with a user", function() {
            expect(this.clients[0].user_id).to.equal(null);
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

        nock(config.authorization_provider.base_uri)
          .post('/authorized')
          .reply(200, { client_id: 11, user_id: 13 });

        requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
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
          message: 'BBC1 says: Hello user 13!'
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
      requestHelper.sendRequest(this, '/resource', { accessToken: null }, done);
    });

    it("should return status 401", function() {
      expect(this.res.statusCode).to.equal(401);
    });

    // jshint expr:true
    it("should return a www-authenticate header", function() {
      expect(this.res.headers['www-authenticate']).to.equal('CPA name="Example AP" uri="https://ap.example.com" modes="client,user"');
    });

    // jshint expr:true
    it("should return an empty response body", function() {
      // expect(this.res.text).to.be.equal("");
      expect(this.res.text).to.be.empty;
    });
  });

  context("with an invalid access token", function() {
    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(401);

      requestHelper.sendRequest(this, '/resource', { accessToken: 'abc123' }, done);
    });

    // jshint expr:true
    it("should return a www-authenticate header", function() {
      expect(this.res.headers['www-authenticate']).to.equal('CPA name="Example AP" uri="https://ap.example.com" modes="client,user"');
    });

    // jshint expr:true
    it("should return an empty response body", function() {
      expect(this.res.text).to.be.empty;
    });
  });

  context("with an incorrect token type", function() {
    before(function(done) {
      requestHelper.sendRequest(this, '/resource', {
        accessToken: 'abc123',
        tokenType:   'Basic'
      }, done);
    });

    it("should return an invalid_request error", function() {
      assertions.verifyError(this.res, 400, 'invalid_request');
    });
  });

  context("when the authorization server fails", function() {
    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(500);

      requestHelper.sendRequest(this, '/resource', { accessToken: 'abc123' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });

  context("when the authorization server returns a null client_id", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(200, { client_id: null, user_id: null });

      requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });

  context("when the authorization server returns an invalid client_id", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(200, { client_id: 'invalid', user_id: null });

      requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });

  context("when the authorization server returns an invalid user_id", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(200, { client_id: 11, user_id: 'invalid' });

      requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });

  context("when the authorization server returns invalid JSON", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.authorization_provider.base_uri)
        .post('/authorized')
        .reply(200, "invalid");

      requestHelper.sendRequest(this, '/resource', { accessToken: '123abc' }, done);
    });

    it("should return status 500", function() {
      expect(this.res.statusCode).to.equal(500);
    });
  });
});
