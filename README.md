# Cross-Platform Authentication - Service Provider

This project contains a reference implementation of the Cross-Platform
Authentication Service Provider.

More information on the [EBU Cross-Platform Authentication project](http://tech.ebu.ch/cpa)

## Prerequisites

Ensure your system has [Node.js](http://nodejs.org/) and NPM installed. Also, install JSHint:

    $ sudo npm install -g jshint

## Getting Started

    $ git clone https://github.com/ebu/cpa-service-provider.git
    $ cd cpa-service-provider
    $ npm install
    
## Run the Tests

    $ mkdir data
    $ NODE_ENV=test bin/init-db
    
    $ npm test

## Configure

The server reads configuration settings from the file `config.local.js`.
An example config for refernce is in `config.dist.js`.

    $ cp config.dist.js config.local.js

Edit `config.local.js` to set any necessary configuration options, for
example, database connection settings.

## Initialise the Database

    $ NODE_ENV=development bin/init-db

## Start the server

    $ bin/server


## Related Projects

* [CPA Authentication Provider](https://github.com/ebu/cpa-auth-provider)
* [CPA Client](https://github.com/ebu/cpa-client)


## Contributors

* [Chris Needham](https://github.com/chrisn) (BBC)
* [Michael Barroco](https://github.com/barroco) (EBU)


## Copyright & License

Copyright (c) 2014, EBU-UER Technology & Innovation

The code is under BSD (3-Clause) License. (see LICENSE.txt)
