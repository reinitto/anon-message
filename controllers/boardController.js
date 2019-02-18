var mongodb = require('mongodb')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
const CONNECTION_STRING = process.env.DB;
const db = mongoose.connect(CONNECTION_STRING,{ useNewUrlParser: true } , function(err, db) {return db});

var replySchema = new Schema({
text: String,
  created_on:{type: Date, default: Date.now},
  delete_password: String,
  reported: {type: Boolean, default: false}
})
var Reply = mongoose.model('reply', replySchema)

var threadSchema = new Schema({
text: {type: String, required: true},
  created_on: {type: Date, default: Date.now},
  bumped_on: {type: Date, default: Date.now},
  delete_password: String,
  reported: {type: Boolean, default: false},
  replies: [replySchema]
})
var Thread = mongoose.model('thread', threadSchema)

var boardSchema = new Schema({
  name: String,
  threads: [threadSchema]
})

var Board = mongoose.model('board', boardSchema)

module.exports = (app, db)=>{
  //Add a thread to a specific board, if board doesn't exist create a new one
  app.route('/api/threads/:board')
    .post((req,res)=>{
    console.log("body: ",req.body)
    console.log("params",req.params)
    var board = req.params.board
    //Create a thread
    var text  = req.body.text
    var password = req.body.delete_password
    var thread = Thread({text: text, delete_password: password}).save((err, thread)=>{
    if(err) console.log("Trouble saving: ", err)
      else {
       //Find board, create if doesn't exist
  Board.findOneAndUpdate({name: board},{name: board, $push:{threads: thread}},{upsert:true, new:true}, (err, messageBoard)=>{
    if(err) console.log(err)
    else {
      var boardName = messageBoard.name
    var URI = encodeURI('/b/'+ boardName)
    console.log('URI: ', URI)
      res.redirect(URI)
    }
    })
      }
    
    })
   
  })
  
  //
  .get((req,res)=>{
   // console.log(req)
    var bName = decodeURI(req.headers.referer)
    console.log("request URI: ",bName)
    var re = /\/b\/([^/]+)/
    
    var board = bName.match(re)[1]
    Board.findOneAndUpdate({name: board},{name:board},{new:true,upsert:true}, (err, result)=>{
      if(err)console.log(err)
      else {
        Thread.find({_id:{ $in: result.threads }},'-delete_password, -__v -reported',{limit:10,sort: {bumped_on:"desc"}}, (err, threads)=>{
          if(err)console.log("Error occured: ",err)
          if(threads){
            var withReplies = [];
            threads.map((thread)=>{
              var replies = thread.replies.sort((a,b)=>{
              return a.created_on < b.created_on
              })
              
              if(replies.length>3){
                replies.length = 3
                thread.replies = replies
                withReplies.push(thread)}
              else {thread.replies = replies
                      withReplies.push(thread)
                     }
            })
            res.json(withReplies)
          }else {console.log('no threads in this message board')
            res.json(result)
                }
        })
      }
    })
  })
  .delete((req,res)=>{
    console.log("Delte body: ", req.body)
    Thread.findOne({_id: req.body.thread_id}, (err, thread)=>{
      if(err) console.log(err)
      if(thread.delete_password !== req.body.delete_password){ res.send("Invalid Password!")}
      else {
        thread.remove()
        res.send("Thread deleted")
      }
    })
  })
  .put((req,res)=>{
  console.log('Req body:  ',req.body)
    var thread_id = req.body.thread_id
    Thread.findOneAndUpdate({_id: thread_id}, {reported: true}, (err,thread)=>{res.send('success, thread reported')})
  })
    
  app.route('/api/replies/:board')
    .post((req,res)=>{
    var board = req.params.board
    var thread_id = req.body.thread_id
     var text  = req.body.text
    var password = req.body.delete_password
    console.log(req.body)
    var reply = Reply({text: text, delete_password: password}).save((err, message)=>{
    if(err)console.log('Error saving to DB: ', err)
      console.log('reply: ', message)
    Thread.findByIdAndUpdate(thread_id,{$push:{replies: message},bumped_on: Date.now()},{new:true}, (err, result)=>{
      if(err)console.log("Error updating thread: ",err)
      else {
      var URI = encodeURI('/b/'+board+'/'+thread_id )
      res.redirect(URI)
      }
    })
   })
  })
  .get((req,res)=>{
    var re = /\/b\/[^/]+\/([^/]+)/
    var thread_id = req.headers.referer.match(re)[1]
 
  Thread.findById(thread_id,'-delete_password, -__v -reported', (err, result)=>{
    if(err) console.log(err)
    else {
      res.json(result)
    }
  })  
 })
  .delete((req,res)=>{
    console.log("DELETE req body: ",req.body)
  var thread_id = req.body.thread_id
  var reply_id = req.body.reply_id
  var password = req.body.delete_password
  Reply.findById(reply_id, (err, result)=>{
    console.log("Reply: ", result)
    if(err) console.log(err)
    if(result.delete_password !== password)  res.send("invalid password")
    else {
      Reply.findOneAndUpdate({_id: reply_id},{text: '[deleted]'},{new:true},(err,reply)=>{
      if(err)console.log(err)
        console.log('Reply after: ',reply)
      })
      Thread.findOneAndUpdate({'replies._id': reply_id}, {'$set': {
      'replies.$.text' : '[deleted]'
}},{new:true} ,(err,done)=>{
        if(err) console.log("Error updating Thread: ",err)
        else{
          console.log("Thread: ", done)
          // var arr = Array.from(done.replies).filter((item)=>{
          // return item._id !== reply_id
          // })
          // done.replies = arr
          // done.save()
          //console.log("replies??::", arr)
        res.send('success')
        }
      })
    
    }
  })
  })
  .put((req,res)=>{
    console.log("req body: ", req.body)
    var replyId = req.body.reply_id
    Reply.findOneAndUpdate({_id: replyId},{reported: true}, (err, reply)=>{
    if(err)console.log(err)
      else {
        Thread.findOneAndUpdate({'replies._id': replyId}, {'$set': {'replies.$.reported': true}}, (err, done)=>{
        if(err)console.log(err)
          else{
          res.send('success')
          }
        
        })
      }
    
    })
  })
  
}