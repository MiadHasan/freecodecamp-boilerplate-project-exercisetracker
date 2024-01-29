const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Database connected")
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port)
    })
  })
  .catch((e) => {
    console.log(e)
  });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
}, { versionKey: false });

userSchema.virtual('exercises', {
  ref: 'Exercise',
  localField: '_id',
  foreignField: 'owner'
})
userSchema.set('toJSON', { virtuals: true })
userSchema.set('toObject', { virtuals: true })

const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  duration: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, { versionKey: false });
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res) => {
  try {
    const user = new User({
      username: req.body.username
    });
    const newUser = await user.save();
    res.json(newUser);
  } catch (e) {
    res.send(e);
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await User.find();
    res.send(allUsers);
  } catch (e) {
    res.send(e);
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const username = (await User.findById(req.params._id)).username;
    const exercise = new Exercise({
      duration: req.body.duration,
      description: req.body.description,
      date: req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString(),
      owner: req.params._id
    });
    const newExercise = await exercise.save();
    res.json({
      username,
      duration: newExercise.duration,
      description: newExercise.description,
      date: newExercise.date,
      _id: newExercise.owner
    });
  } catch (e) {
    res.send(e);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const user = await User.findById(req.params._id);
  await user.populate('exercises');
  const log = user.exercises.map((item) => (
    { 
      "description": item.description,
      "duration": item.duration, 
      "date": item.date 
    }
  ));
  
  let filteredLog;
  if (req.query.from && req.query.to) {
    filteredLog = log.filter((item) => (new Date(item.date) >= new Date(req.query.from) && new Date(item.date) <= new Date(req.query.to)))
  }
  else if (req.query.from) {
    filteredLog = log.filter((item) => (new Date(item.date) >= new Date(req.query.from)))
  }
  else if (req.query.to) {
    filteredLog = log.filter((item) => new Date(item.date) <= new Date(req.query.to))
  }
  else {
    filteredLog = log;
  }

  if (req.query.limit) {
    filteredLog = filteredLog.slice(0, req.query.limit);
  }

  res.json({
    username: user.username,
    count: filteredLog.length,
    _id: user._id,
    log: filteredLog
  })
});
