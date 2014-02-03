MOCHA  = node_modules/.bin/mocha
JSHINT = jshint
JSDOC  = jsdoc

ifdef VERBOSE
  REPORTER = spec
else
  REPORTER = dot
endif

export NODE_ENV = test

all: lint test

test:
	@$(MOCHA) --bail --timeout 10000 --reporter $(REPORTER) --require test/test-helper test/lib

lint: lint-src lint-test

lint-src:
	@$(JSHINT) bin/* lib/*.js routes/*.js test/*.js

lint-test:
	@$(JSHINT) --config .jshintrc-test test/lib/*.js

doc:
	@$(JSDOC) --private --destination ./docs/ lib models routes

docs: doc

.PHONY: test lint lint-src lint-test doc docs
