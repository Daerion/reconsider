# reconsider
Reconsider is a minimalistic promise based database migration tool for rethinkdb that is meant to be called programmatically. Currently there is no CLI for it, though I do plan to add one in the near future.
 
Reconsider is not currently compatible with the native rethinkdb driver but instead requires [rethinkdbdash](https://github.com/neumino/rethinkdbdash).

## Installation
```
npm install --save reconsider
```

## Usage
By default, Reconsider will attempt to run all migrations found in the `migrations/` directory of the current process. When instantiating the Reconsider class, you must provide it with an already connected rethinkdbdash object and a database name.

```js
import rethinkdb from 'rethinkdbdash'

const db = 'my_database'
const r = rethinkdb({ host: 'localhost', db })
const recon = new Reconsider(r, { db })
```

Migrating up or down is as simple as calling the `migrateUp()` or `migrateDown()` method of the Reconsider instance. Both these methods will return a promise that resolves to an array of operation info objects, each one of them containing an `id` and an `elapsed` property. 

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
 
Alternatively, you can provide a custom logger implementation, e.g. an instance of [winston](https://github.com/winstonjs/winston) or similar. When doing so, the provided object must implement methods for all supported log levels. Note that setting a `logLevel` will have no effect in this case, since Reconsider will assume that your logger as already been configured appropriately.

```js
// Provide custom logger implementation
const myLoggerInstance = getLoggerInstanceSomehow()
const recon = new Reconsider(r, { db: 'my_database' }, myLoggerInstance)
```

## Author
[Michael Smesnik](https://github.com/daerion)

## License
MIT