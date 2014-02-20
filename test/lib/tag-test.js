"use strict";

var app = require('../../lib/app');
var db  = require('../../models');

var assertions    = require('../assertions');
var requestHelper = require('../request-helper');

var nock      = require('nock');
var xpath     = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var cheerio   = require('cheerio');

var clearDatabase = function(done) {
  db.sequelize.query('DELETE FROM Users').then(function() {
    return db.sequelize.query('DELETE FROM Clients');
  })
  .then(function() {
    return db.sequelize.query('DELETE FROM Tags');
  })
  .then(function() {
    done();
  },
  function(error) {
    done(error);
  });
};

var initDatabase = function(done) {
  db.User
    .create({ id: 12 })
    .then(function() {
      return db.Client.create({ id: 11, user_id: 12 });
    })
    .then(function() {
      return db.Tag.create({
        id:        'cc5355c3-93f1-4616-9a54-9093a0c656fc',
        client_id: 11,
        station:   'radio1',
        time:      new Date(1391017811000)
      });
    })
    .then(function() {
      return db.Tag.create({
        id:        '4575bf06-9919-4237-9eb7-8c4f42885774',
        client_id: 11,
        station:   'radio2',
        time:      new Date(1391017812000)
      });
    })
    .then(function() {
      return db.Tag.create({
        id:        'e39ec3f6-09c9-4b58-82c1-70782aa8ad7c',
        client_id: 11,
        station:   'radio3',
        time:      new Date(1391017810000)
      });
    })
    .then(function() {
      done();
    },
    function(error) {
      done(error);
    });
};

var verifyXPathNodeValue = function(doc, path, value) {
  var nodes = xpath.select(path, doc);
  expect(nodes.length).to.equal(1, "xpath " + path + " returned no elements");
  expect(nodes[0].firstChild.data).to.equal(value);
};

var verifyXPathAttribute = function(doc, path, value) {
  var nodes = xpath.select(path, doc);
  expect(nodes.length).to.equal(1, "xpath " + path + " returned no elements");
  expect(nodes[0].nodeValue).to.equal(value);
};

describe("GET /tags", function() {
  before(clearDatabase);

  context("given a valid access token", function() {
    before(initDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(200, { client_id: 11, user_id: 12 });

      requestHelper.sendRequest(this, '/tags', { accessToken: '123abc' }, done);
    });

    it("should return status 200", function() {
      expect(this.res.statusCode).to.equal(200);
    });

    it("should return an atom document", function() {
      expect(this.res.headers['content-type']).to.equal('application/atom+xml; charset=utf-8');
      expect(this.res.text).to.match(/^<\?xml/);
    });

    describe("the atom document", function() {
      before(function() {
        var parser = new DOMParser();
        this.doc = parser.parseFromString(this.res.text);
      });

      it("should reference the atom namespace");
        // TODO: xmlns => "http://www.w3.org/2005/Atom"
      it("should reference the radiotag namespace");
        // TODO: 'xmlns:radiotag' => 'http://radiodns.org/2011/radiotag'

      it("should contain a title", function() {
        verifyXPathNodeValue(this.doc, '/feed/title', 'Tag List');
      });

      it("should have a self link url", function() {
        verifyXPathAttribute(this.doc, "/feed/link[@rel='self']/@href", 'http://example.com/clients/11/tags');
      });

      describe("the updated date", function() {
        it("should be the time of the most recent tag", function() {
          verifyXPathNodeValue(this.doc, '/feed/updated', '2014-01-29T17:50:12Z');
        });
      });

      it("should have an author", function() {
        verifyXPathNodeValue(this.doc, '/feed/author/name', 'BBC1');
      });

      it("should have a unique identifier", function() {
        verifyXPathNodeValue(this.doc, '/feed/id', 'urn:radiotag:client:11');
      });

      it("should contain an entry for each of the user's tags", function() {
        var nodes = xpath.select('/feed/entry', this.doc);
        expect(nodes.length).to.equal(3);
      });

      describe("the entries", function() {
        describe("the title field", function() {
          it("should include the tag id", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry[1]/title', 'Tag: radio2 at 2014-01-29T17:50:12Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[2]/title', 'Tag: radio1 at 2014-01-29T17:50:11Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[3]/title', 'Tag: radio3 at 2014-01-29T17:50:10Z');
          });
        });

        describe("the radiotag:sid field", function() {
          it("should equal the tag's station identifier", function() {
            verifyXPathNodeValue(this.doc, "/feed/entry[1]/*[local-name(.)='sid']", 'radio2');
            verifyXPathNodeValue(this.doc, "/feed/entry[2]/*[local-name(.)='sid']", 'radio1');
            verifyXPathNodeValue(this.doc, "/feed/entry[3]/*[local-name(.)='sid']", 'radio3');
          });
        });

        describe("the radiotag:service field", function() {
          it("should equal the tag's station name", function() {
            // TODO: should be station display local-name
            verifyXPathNodeValue(this.doc, "/feed/entry[1]/*[local-name(.)='service']", 'radio2');
            verifyXPathNodeValue(this.doc, "/feed/entry[2]/*[local-name(.)='service']", 'radio1');
            verifyXPathNodeValue(this.doc, "/feed/entry[3]/*[local-name(.)='service']", 'radio3');
          });
        });

        describe("the id field", function() {
          it("should contain the tag identifier", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry[1]/id', 'urn:uuid:4575bf06-9919-4237-9eb7-8c4f42885774');
            verifyXPathNodeValue(this.doc, '/feed/entry[2]/id', 'urn:uuid:cc5355c3-93f1-4616-9a54-9093a0c656fc');
            verifyXPathNodeValue(this.doc, '/feed/entry[3]/id', 'urn:uuid:e39ec3f6-09c9-4b58-82c1-70782aa8ad7c');
          });
        });

        describe("the updated field", function() {
          it("should equal the tag time", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry[1]/updated', '2014-01-29T17:50:12Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[2]/updated', '2014-01-29T17:50:11Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[3]/updated', '2014-01-29T17:50:10Z');
          });
        });

        describe("the published field", function() {
          it("should equal the tag time", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry[1]/published', '2014-01-29T17:50:12Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[2]/published', '2014-01-29T17:50:11Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[3]/published', '2014-01-29T17:50:10Z');
          });
        });

        describe("the summary field", function() {
          it("should include the tag description", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry[1]/summary', 'Description of tag: radio2 at 2014-01-29T17:50:12Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[2]/summary', 'Description of tag: radio1 at 2014-01-29T17:50:11Z');
            verifyXPathNodeValue(this.doc, '/feed/entry[3]/summary', 'Description of tag: radio3 at 2014-01-29T17:50:10Z');
          });
        });

        describe("the image link field", function() {
          it("should include an image url", function() {
            verifyXPathAttribute(this.doc, "/feed/entry[1]/link[@rel='image']/@href", 'http://example.com/image.png');
            verifyXPathAttribute(this.doc, "/feed/entry[2]/link[@rel='image']/@href", 'http://example.com/image.png');
            verifyXPathAttribute(this.doc, "/feed/entry[3]/link[@rel='image']/@href", 'http://example.com/image.png');
          });
        });

        describe("the canonical link field", function() {
          it("should include a url", function() {
            verifyXPathAttribute(this.doc, "/feed/entry[1]/link[@rel='canonical']/@href", 'http://example.com/radio2/1391017812');
            verifyXPathAttribute(this.doc, "/feed/entry[2]/link[@rel='canonical']/@href", 'http://example.com/radio1/1391017811');
            verifyXPathAttribute(this.doc, "/feed/entry[3]/link[@rel='canonical']/@href", 'http://example.com/radio3/1391017810');
          });
        });
      });
    });
  });

  context("given an invalid access token", function() {
    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(401);

      requestHelper.sendRequest(this, '/tags', { accessToken: '456def' }, done);
    });

    it("should return an 'unauthorized' error", function() {
      assertions.verifyError(this.res, 401, 'unauthorized');
    });
  });
});

describe("POST /tag", function() {
  context("given valid tag data", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(200, { user_id: 11, client_id: 12 });

      var data = {
        station: 'radio1',
        time: 1390981693
      };

      requestHelper.sendRequest(this, '/tag', {
        method:      'post',
        data:        data,
        accessToken: '123abc'
      }, done);
    });

    it("should return status 201", function() {
      expect(this.res.statusCode).to.equal(201);
    });

    it("should return an atom document", function() {
      expect(this.res.headers['content-type']).to.equal('application/atom+xml; charset=utf-8');
      expect(this.res.text).to.match(/^<\?xml/);
    });

    describe("the atom document", function() {
      before(function() {
        var parser = new DOMParser();
        this.doc = parser.parseFromString(this.res.text);
      });

      it("should reference the atom namespace");
        // TODO: xmlns => "http://www.w3.org/2005/Atom"
      it("should reference the radiotag namespace");
        // TODO: 'xmlns:radiotag' => 'http://radiodns.org/2011/radiotag'

      it("should contain a title", function() {
        verifyXPathNodeValue(this.doc, '/feed/title', 'Tag List');
      });

      it("should have an author", function() {
        verifyXPathNodeValue(this.doc, '/feed/author/name', 'BBC1');
      });

      it("should contain a unique identifier", function() {
        verifyXPathNodeValue(this.doc, '/feed/id', 'urn:radiotag:client:12');
      });

      it("should have a self link url", function() {
        verifyXPathAttribute(this.doc, "/feed/link[@rel='self']/@href", 'http://example.com/clients/12/tags');
      });

      describe("the updated date", function() {
        it("should be the time of the tag", function() {
          verifyXPathNodeValue(this.doc, '/feed/updated', '2014-01-29T07:48:13Z');
        });
      });

      it("should contain a single entry", function() {
        var nodes = xpath.select('/feed/entry', this.doc);
        expect(nodes.length).to.equal(1);
      });

      describe("the entry", function() {
        describe("the title field", function() {
          it("should include the tag id", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry/title', 'Tag: radio1 at 2014-01-29T07:48:13Z');
          });
        });

        describe("the radiotag:sid field", function() {
          it("should equal the tag's station identifier", function() {
            verifyXPathNodeValue(this.doc, "/feed/entry/*[local-name(.)='sid']", 'radio1');
          });
        });

        describe("the radiotag:service field", function() {
          it("should equal the tag's station name", function() {
            // TODO: should be station display local-name
            verifyXPathNodeValue(this.doc, "/feed/entry/*[local-name(.)='service']", 'radio1');
          });
        });

        describe("the id field", function() {
          it("should contain the a unique tag identifier", function() {
            var nodes = xpath.select('/feed/entry/id', this.doc);
            expect(nodes.length).to.equal(1);
            expect(nodes[0].firstChild.data).to.match(/^urn:uuid:[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}$/);
          });
        });

        describe("the updated field", function() {
          it("should equal the tag time", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry/updated', '2014-01-29T07:48:13Z');
          });
        });

        describe("the published field", function() {
          it("should equal the tag time", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry/published', '2014-01-29T07:48:13Z');
          });
        });

        describe("the summary field", function() {
          it("should include the tag description", function() {
            verifyXPathNodeValue(this.doc, '/feed/entry/summary', 'Description of tag: radio1 at 2014-01-29T07:48:13Z');
          });
        });

        describe("the image link field", function() {
          it("should include an image url", function() {
            verifyXPathAttribute(this.doc, "/feed/entry/link[@rel='image']/@href", 'http://example.com/image.png');
          });
        });

        describe("the canonical link field", function() {
          it("should include a url", function() {
            verifyXPathAttribute(this.doc, "/feed/entry/link[@rel='canonical']/@href", 'http://example.com/radio1/1390981693');
          });
        });
      });
    });

    describe("the database", function() {
      before(function(done) {
        var self = this;

        db.Tag.findAll().then(function(tags) {
          self.tags = tags;
          done();
        },
        function(error) {
          done(error);
        });
      });

      it("should contain a new tag", function() {
        expect(this.tags.length).to.equal(1);
      });

      describe("the tag", function() {
        before(function() {
          this.tag = this.tags[0];
        });

        it("should have the correct time", function() {
          expect(this.tag.time).to.be.instanceof(Date);
          expect(this.tag.time.getTime()).to.equal(1390981693 * 1000);
        });

        it("should have the correct station identifier", function() {
          expect(this.tag.station).to.equal('radio1');
        });

        it("should be associated with the correct client id", function() {
          expect(this.tag.client_id).to.equal(12);
        });
      });
    });
  });

  context("with missing time", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(200, { user_id: 11, client_id: 12 });

      var data = {
        station: 'radio1'
        // time: 1390981693
      };

      requestHelper.sendRequest(this, '/tag', {
        method:      'post',
        data:        data,
        accessToken: '123abc'
      }, done);
    });

    it("should return status 400", function() {
      expect(this.res.statusCode).to.equal(400);
    });
  });

  context("with invalid time", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(200, { user_id: 11, client_id: 12 });

      var data = {
        station: 'radio1',
        time: 'invalid'
      };

      requestHelper.sendRequest(this, '/tag', {
        method:      'post',
        data:        data,
        accessToken: '123abc'
      }, done);
    });

    it("should return status 400", function() {
      expect(this.res.statusCode).to.equal(400);
    });
  });

  context("with missing station identifier", function() {
    before(clearDatabase);

    before(function(done) {
      var config = app.get('config');

      nock(config.uris.authorization_uri)
        .post('/authorized')
        .reply(200, { user_id: 11, client_id: 12 });

      var data = {
        // station: 'radio1',
        time: 1390981693
      };

      requestHelper.sendRequest(this, '/tag', {
        method:      'post',
        data:        data,
        accessToken: '123abc'
      }, done);
    });

    it("should return status 400", function() {
      expect(this.res.statusCode).to.equal(400);
    });
  });
});

describe("GET /tags/all", function() {
  before(clearDatabase);

  context("with no tags in the database", function() {
    before(function(done) {
      requestHelper.sendRequest(this, '/tags/all', null, done);
    });

    it("should return status 200", function() {
      expect(this.res.statusCode).to.equal(200);
    });

    it("should return an HTML document", function() {
      expect(this.res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(this.res.text).to.match(/^<!DOCTYPE html>/);
    });
  });

  context("with some tags in the database", function() {
    before(initDatabase);

    before(function(done) {
      requestHelper.sendRequest(this, '/tags/all', { parseDOM: true }, done);
    });

    it("should return status 200", function() {
      expect(this.res.statusCode).to.equal(200);
    });

    it("should return an HTML document", function() {
      expect(this.res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(this.res.text).to.match(/^<!DOCTYPE html>/);
    });

    describe("the HTML document", function() {
      it("should have a list of tags", function() {
        var elements = this.$('table tbody tr');
        expect(elements.length).to.equal(3);
      });
    });
  });
});
