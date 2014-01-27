"use strict";

global.chai = require("chai");
global.expect = global.chai.expect;
global.sinon = require("sinon");

var sinonChai = require("sinon-chai");
global.chai.use(sinonChai);

global.request = require("supertest");
