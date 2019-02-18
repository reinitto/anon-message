/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var mongoose = require('mongoose');
const CONNECTION_STRING = process.env.DB;
const db = mongoose.connect(CONNECTION_STRING,{ useNewUrlParser: true } , function(err, db) {return db});
const boardController = require('../controllers/boardController')

module.exports = function (app) {
  
  boardController(app, db)
  


};
