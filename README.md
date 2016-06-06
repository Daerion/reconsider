# reconsider
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Reconsider is a minimalistic promise based database migration tool for rethinkdb that is meant to be called programmatically. Currently there is no CLI for it, though I do plan to add one in the near future.

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

Alternatively, you can provide a custom logger implementation, e.g. an instance of [winston](https://github.com/winstonjs/winston) or similar. When doing so, the provided object must implement methods for all supported log levels. Note that setting a `logLevel` via the config object will have no effect in this case, since Reconsider will assume that your logger as already been configured appropriately.

```js
// Provide custom logger implementation
const myLoggerInstance = getLoggerInstanceSomehow()
const recon = new Reconsider(r, { db: 'my_database' }, myLoggerInstance)
```

## API Docs
Official API documentation lives [here](https://daerion.github.io/reconsider).

## Author
[Michael Smesnik](https://github.com/daerion)

## License
MIT
