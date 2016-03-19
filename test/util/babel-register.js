'use strict'

require('babel-register')({
  only: [ 'test/*.js', 'test/**/*.js' ]
})
require('babel-polyfill')
