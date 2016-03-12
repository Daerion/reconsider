'use strict'

const path = require('path')

require('babel-register')({
  ignore: new RegExp(path.resolve(__dirname, '../..', 'node_modules'))
})
require('babel-polyfill')
