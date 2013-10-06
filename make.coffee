require 'shelljs/make'

target.all = ->
  target.docs()

target.docs = ->
  cd __dirname
  exec './node_modules/jsdoc/nodejs/bin/jsdoc -d docs/api backend/*.js'