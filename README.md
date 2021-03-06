# reconsider
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

**DEPRECATED** -
Use [adbm](https://github.com/daerion/adbm) in combination with the [adbm-rethinkdb](https://github.com/daerion/adbm-rethinkdb) adapter as a replacement if you're on node >= 7.6.0. Helper functions have been moved to `adbm-rethinkdb/helpers`.
---

Reconsider is a minimalistic promise based database migration tool for rethinkdb that is meant to be called programmatically. Currently there is no CLI for it, though I am willing to add one if there is any sort of demand for it.

Reconsider is not currently compatible with the native rethinkdb driver but instead requires [rethinkdbdash](https://github.com/neumino/rethinkdbdash).

## Installation
```
npm install --save reconsider
```

## Usage
### Defining Migrations
Each migration must be a module exporting an object with an `up` and a `down` function, residing in the configured migrations directory (`migrations/` by default). Both methods will be passed the rethinkdb driver instance as their first parameter, and the logger instance as the second one. Since all the database operations performed in a migration are inherently async, both methods must return a Promise.

#### Sample Migration File
```js
// File migrations/001-create-tables.js

'use strict'

const tableName = 'my_table'

module.exports = {
  up: function (r, logger) {
    logger.verbose(`Creating table ${tableName}.`)

    return r.tableCreate(tableName).run()
      .then(() => r.table(tableName).indexCreate('some_property').run())
  },

  down: function (r, logger) {
    logger.verbose(`Dropping table ${tableName}.`)

    return r.tableDrop(tableName).run()
  }
}
```

### Running Migrations
When instantiating the Reconsider class, you must provide it with an already connected rethinkdbdash object and a database name. Reconsider will attempt to create both the database and it's own migrations table if either don't exist.

```js
import rethinkdb from 'rethinkdbdash'
import Reconsider from 'reconsider' // or `const Reconsider = require('reconsider').default`

const db = 'my_database'
const r = rethinkdb({ host: 'localhost', db })
const recon = new Reconsider(r, { db })
```

Migrating up or down is as simple as calling the `migrateUp()` or `migrateDown()` method of the Reconsider instance. Both these methods will return a promise that resolves to an array of operation info objects, each one of them containing an `id` and an `elapsed` property.
When migrating up, Reconsider will attempt to run all pending migrations found in the `migrations/` directory of the current process by default. When migrating down, Reconsider will revert all migrations stored in the `_reconsider_migration` table.
Once a migration has been run successfully, it will not be run again on subsequent invocations of the `migrateUp` method, unless it has been reverted via `migrateDown()`.

```js
// Run all pending migrations
recon.migrateUp().then((ops) => console.dir(ops))

// Or, if you're using babel
const ops = await recon.migrateUp()

// ops will be something like this
[{
  id: '001-create-tables',  // id of the migration
  elapsed: 7.597834  // Time it took for the migration to complete (in seconds)
}, {
  id: '002-add-initial-values',
  elapsed: 0.0123168
}]
```

### Configuration Options
Currently, the config object passed into the Reconsider constructor supports the following properties:

| Property | Default | Description |
| --- | --- | --- |
| `db` |  | Database name (*required*)  |
| `sourceDir` | `migrations/` | Directory containing the migrations |
| `tableName` | `_reconsider_migration` | Database table containing information about previously run migrations |
| `logLevel` | `info` | Minimum log level |

### Error Handling
Reconsider does **not** catch any errors on purpose, it is the caller's responsibility to handle errors appropriately. The basic reason for this is that handling migration errors would either involve too much guesswork or introduce a host of new config options for no good reason (Revert everything? Don't revert anything? Attempt to call the failed migration's `down` method?).

```js
recon.migrateUp()
  .then((ops) => console.dir(ops))
  .catch((err) => {
    // Handle error here
  })
```

One consequence of Reconsider's lack of error catching is that an error in any migration will prevent all subsequent migrations from running. This, too, is intended behavior, since database migrations will more often than not rely on changes introduced by previous migrations. Since no automatic rollback is performed, and since all successful migrations will still register, `migrateUp` and `migrateDown` can safely be called again once the problem has been resolved.

This should also encourage the user to write small migrations that change one thing at a time, as opposed to huge migration files with several chained `.then`s.

### Logging
Reconsider will output various messages to stdout by default, using `console.log`, `console.info` and `console.warn` as appropriate. All output is categorized into one of the following log levels: `debug`, `verbose`, `info`, `warn`, `error`. Minimum log level can be set via the `logLevel` config option.

``` js
// Use built in logger, don't output anything below "info" level (default config)
const recon = new Reconsider(r, {
  db: 'my_database',
  logLevel: 'info'
})

// Disable logging
const recon = new Reconsider(r, { db: 'my_database' }, false)
```

Alternatively, you can provide a custom logger implementation, e.g. an instance of [winston](https://github.com/winstonjs/winston) or similar. When doing so, the provided object must implement methods for all supported log levels. Note that setting a `logLevel` via the config object will have no effect in this case, since Reconsider will assume that your logger has already been configured appropriately.

```js
// Provide custom logger implementation
const myLoggerInstance = getLoggerInstanceSomehow()
const recon = new Reconsider(r, { db: 'my_database' }, myLoggerInstance)
```

## Helpers
As of version 1.1.0, Reconsider includes a small set of helper functions meant to simplify and automate common database migration tasks, namely creating tables or indices. Each of these functions will return a database migration object, i.e. an object exposing `up` and `down` methods, which can then be exported by the migration file.  

### createTablesMigration
This function will return a migration that will create tables when migrating up and drop these tables when migrating down. `createTablesMigration` expects an array of table names.

```js
// In file migrations/xx-create-tables.js
const { helpers } = require('reconsider')

module.exports = helpers.createTablesMigration([ 'first_table', 'second_table' ])
````

### createIndexMigration
This function will return a migration that will create indices when migrating up and drop these indices when migrating down. `createIndexMigration` expects an array of index specifications. Each index specification is an object containing a `table` and an `index` property, and optionally an `options` object and/or a `spec` function.
An `options` object can be anything that `r.indexCreate()` accepts, while the `spec` property must be a function that returns an index definition (which, again, can be anything that `r.indexCreate()` accepts). `spec` will be passed the rethinkdbdash instance when it is executed.

```js
// In file migrations/xx-create-indices.js
const { helpers } = require('reconsider')
const table = 'first_table'

module.exports = helpers.createIndexMigration([
    { table, index: 'someProp' }, // Simple index
    { table, index: 'compoundIndex', spec: (r) => [ r.row('firstProp'), r.row('secondProp') ] }, // Compound index
    { table, index: 'geoProp', options: { geo: true } }, // Geo index
    { table, index: 'multiIndex', options: { multi: true } }, // Multi index
    { table, index: 'arbitraryExpr', spec: (r) => (doc) => r.branch(doc.hasFields('foo'), doc('foo'), doc('bar')) } // Index based on an arbitrary expression
])
```

## Testing
A simple Vagrant VM running a RethinkDB server has been included in the `test/misc` folder.
 
```
npm run test
```

## API Docs
Official API documentation lives [here](https://daerion.github.io/reconsider).

## Author
[Michael Smesnik](https://github.com/daerion)

## License
MIT
