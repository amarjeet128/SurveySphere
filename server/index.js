require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const responseRoutes = require('./routes/responseRoutes');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Connect to database
connectDB();

// Security Middleware
app.use(helmet());
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// General Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/responses', responseRoutes);

// Socket.io Logic
const liveStates = {}; // Dictionary to hold state per poll code

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Participants join a specific poll room
  socket.on('join-poll-room', (code) => {
    socket.join(code);
    if (liveStates[code]) {
      socket.emit('live-state-update', liveStates[code]);
    } else {
      socket.emit('live-state-update', { isActive: false, isEnded: false, question: null, votes: {}, participants: [] });
    }
  });

  // Admin events
  socket.on('admin-start-poll', ({ code, question }) => {
    liveStates[code] = { isActive: true, isEnded: false, question, votes: {}, participants: [], responsesCount: 0 };
    socket.join(code); // Admin also joins the room
    io.to(code).emit('live-state-update', liveStates[code]);
  });

  socket.on('admin-slide-changed', ({ code, question }) => {
    if (liveStates[code] && liveStates[code].isActive) {
      liveStates[code].question = question;
      liveStates[code].votes = {};
      liveStates[code].responsesCount = 0;
      io.to(code).emit('live-state-update', liveStates[code]);
    }
  });

  socket.on('admin-stop-poll', async (code) => {
    if (liveStates[code]) {
      liveStates[code].isActive = false;
      liveStates[code].isEnded = true;
      io.to(code).emit('live-state-update', liveStates[code]);

      try {
        const Survey = require('./models/Survey');
        await Survey.findOneAndUpdate(
          { surveyCode: code },
          { $set: { liveResults: { participants: liveStates[code].participants, votes: liveStates[code].votes } } }
        );
      } catch (e) {
        console.error('Failed to save live poll results:', e);
      }
    }
  });

  socket.on('request-live-state', (code) => {
    if (code && liveStates[code]) {
      socket.emit('live-state-update', liveStates[code]);
    }
  });

  // Participant events
  socket.on('participant-joined', ({ code, name }) => {
    if (liveStates[code] && name) {
      if (!liveStates[code].participants.includes(name)) {
        liveStates[code].participants.push(name);
        io.to(code).emit('live-state-update', liveStates[code]);
      } else {
        socket.emit('live-state-update', liveStates[code]);
      }
    }
  });

  socket.on('submit-vote', ({ code, answer }) => {
    const state = liveStates[code];
    if (state && state.isActive && state.question) {
      state.responsesCount = (state.responsesCount || 0) + 1;
      const type = state.question.type;
      
      if (type === 'scales') {
        try {
          const ratings = JSON.parse(answer);
          Object.entries(ratings).forEach(([optName, val]) => {
            if (!state.votes[optName]) state.votes[optName] = { sum: 0, count: 0 };
            state.votes[optName].sum += val;
            state.votes[optName].count += 1;
          });
        } catch(e) { console.error('Error parsing scales vote:', e); }
      } 
      else if (type === 'ranking') {
        try {
          const data = JSON.parse(answer);
          const order = data.order || [];
          const numOptions = state.question.options.length;
          
          order.forEach((optName, index) => {
            const points = numOptions - index;
            state.votes[optName] = (state.votes[optName] || 0) + points;
          });
        } catch(e) { console.error('Error parsing ranking vote:', e); }
      }
      else {
        // multiple_choice, word_cloud, open_ended, qa, etc.
        state.votes[answer] = (state.votes[answer] || 0) + 1;
      }

      io.to(code).emit('live-state-update', state); // Update everyone in the room
      io.to(code).emit('vote-animation', { answer, type }); // Trigger animation
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api', (req, res) => {
  res.send('SurveySphere API is running');
});

// Serve frontend in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'index.html')));
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
