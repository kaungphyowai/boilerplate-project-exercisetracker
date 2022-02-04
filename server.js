const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose');

//required middleware
app.use(bodyParser.urlencoded({ extended: false }))
require('dotenv').config()
mongoose.connect(process.env.MONGODB_KEY);
app.use(cors())
app.use(express.static('public'))

//database scheme
let userScheme = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
})

const User = mongoose.model('User', userScheme)

let exercieScheme = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
})

const Exercise = mongoose.model('Exercise', exercieScheme)

// responser
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', async (req, res) => {
  let username = req.body.username;
  let newUser = new User({
    username: username
  });
  let error = newUser.validateSync();
  if (error === undefined) {
    await newUser.save()
    res.json(newUser)
  } else {
    res.send(error.errors.username.message)
  }
})

app.get('/api/users', async (req, res) => {
  let users = await User.find({}, { "__v": 0 });
  res.json(users)
})

app.post("/api/users/:_id/exercises", (req, res) => {
  let exerciseData = req.body;
  //get userName with Id
  let userId = req.params._id;
  User.findById(userId, { "__v": 0 }, async (err, user) => {
    if (err) {
      res.send(err.message)

    } else {
      let newExercise = new Exercise({
        username: user.username,
        description: exerciseData.description,
        duration: exerciseData.duration,
        date: exerciseData.date
      })
      let error = newExercise.validateSync();
      if (error === undefined) {
        await newExercise.save();
        let responsJson = {
          _id: user._id,
          username: user.username,
          date: newExercise.date.toDateString(),
          duration: newExercise.duration,
          description: newExercise.description
        }
        res.json(responsJson)
      } else {
        console.log(error.message)
      }
    }
  })

})

app.get("/api/users/:_id/logs", (req, res) => {
  let query = req.query;
  let userId = req.params._id;
  //get the user data
  User.findById(userId, { "__v": 0 }, async (err, user) => {
    if (err) {
      res.send(err.message)
    } else {
      //get the exercise docs
      let logs =  Exercise.find({ "username": user.username, }, { __v: 0, _id: 0, username: 0, });
      if(query.from !== undefined){
        logs = logs.where('date').gte(query.from);
      }
      if(query.to !== undefined){
        logs = logs.where('date').lt(query.to)
      }
      logs = await logs.limit(query.limit)
       logs = logs.map(log => {
        return {
          "description": log.description,
          "duration": log.duration,
          "date": log.date.toDateString()
        }
      })
      let responseJson = {
        _id: user._id,
        username: user.username,
        count: logs.length,
        log: logs
      }
      res.json(responseJson)
    }
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
