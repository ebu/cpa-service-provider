# Cross-Platform Authentication - Service Provider

This project contains a reference implementation of the Cross-Platform
Authentication Service Provider.

## Prerequisites

Ensure your system has [Node.js](http://nodejs.org/) and NPM installed. Also, install JSHint:

    $ sudo npm install -g jshint

## Getting Started

    $ git clone https://github.com/ebu/cpa-service-provider.git
    $ cd cpa-service-provider
    $ npm install

## Run the Tests

    $ npm test

## Configure

The server reads configuration settings from the file `config.local.js`.
An example config for refernce is in `config.dist.js`.

    $ cp config.dist.js config.local.js

Edit `config.local.js` to set any necessary configuration options, for
example, database connection settings.

## Initialise the Database

    $ bin/init-db

## Start the server

    $ bin/server
