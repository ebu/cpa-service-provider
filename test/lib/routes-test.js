"use strict";

var app = require('../../lib/app');

var requestHelper = require('../request-helper');

describe('GET /', function() {
  beforeEach(function(done) {
    requestHelper.sendRequest(this, '/', null, done);
  });

  it('respond with something', function() {
    expect(this.res.statusCode).to.equal(200);
  });

  it('should respond with HTML', function() {
    expect(this.res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(this.res.text).to.match(/^<!DOCTYPE html>\n<html>/);
  });
});
