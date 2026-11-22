#!/usr/bin/env node
'use strict';
if (!process.argv[2]) throw Error('Catalog output path is required');
require('./generate-data.cjs').generate();
require('./generate-charging.cjs').generate();
require('./generate-roamer.cjs').generate();
require('./export-ios-catalog.cjs').writeCatalog(process.argv[2]);
