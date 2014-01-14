"use strict";

var app = require('../../lib/app');
var db  = require('../../models');

describe('PUT /user', function() {
  beforeEach(function(done) {
    var self = this;

    request(app).put('/user', 'NAME')
      .end(function(err, res) {
        self.res = res;
        done(err);
      });
  });

  // jshint expr:true
  it('should store the user in the database', function(done) {
    var name = 'NAME';

    db.User
      .find({ where: { username: name } })
      .complete(function(err, user) {
        expect(err).to.equal(null);
        expect(user).to.be.ok;
        expect(user.username).to.equal(name);
        done();
      });
  });
});
