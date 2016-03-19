# reconsider
Reconsider is a minimalistic promise based database migration tool for rethinkdb that is meant to be called programmatically. Currently there is no CLI for it, though I do plan to add one in the near future.
 
Reconsider is not currently compatible with the native rethinkdb driver but instead requires [rethinkdbdash](https://github.com/neumino/rethinkdbdash).

## Usage
By default, Reconsider will attempt to run all migrations found in the `migrations/` directory of the current process. 
