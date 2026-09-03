require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const livePollRoutes = require('./routes/livePollRoutes');
const responseRoutes = require('./routes/responseRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const http = require('http');
const path = require('path');
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
app.use(helmet({ crossOriginResourcePolicy: false }));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// General Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/livepolls', livePollRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/upload', uploadRoutes);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    const existingParticipants = liveStates[code]?.participants || [];
    const existingParticipantData = liveStates[code]?.participantData || {};
    const existingSeenSlides = liveStates[code]?.slidesSeen || new Set();

    liveStates[code] = {
      isActive: true,
      isEnded: false,
      question,
      votes: {},
      participants: existingParticipants,
      participantData: existingParticipantData, // tracks { name: { joinedAt, lastVoteAt, slideCount } }
      slidesSeen: existingSeenSlides,
      responsesCount: 0,
      totalSlides: question.totalSlides || 1
    };
    socket.join(code); // Admin also joins the room
    io.to(code).emit('live-state-update', liveStates[code]);
  });

  socket.on('admin-slide-changed', ({ code, question }) => {
    if (liveStates[code] && liveStates[code].isActive) {
      liveStates[code].question = question;
      // Track total slides seen
      const seenSlides = liveStates[code].slidesSeen || new Set();
      seenSlides.add(question.id);
      liveStates[code].slidesSeen = seenSlides;
      liveStates[code].totalSlides = seenSlides.size;
      if (!liveStates[code].votes[question.id]) {
        liveStates[code].votes[question.id] = {};
      }
      io.to(code).emit('live-state-update', liveStates[code]);
    }
  });

  socket.on('admin-stop-poll', async (code) => {
    if (liveStates[code]) {
      liveStates[code].isActive = false;
      liveStates[code].isEnded = true;

      try {
        const LivePoll = require('./models/LivePoll');
        const state = liveStates[code];
        const totalSlides = state.totalSlides || 1;

        // Build participantsData with avgTime
        const participantsData = Object.entries(state.participantData || {}).map(([name, data]) => {
          const totalSeconds = data.lastVoteAt
            ? (data.lastVoteAt - data.joinedAt) / 1000
            : null;
          const avgTime = totalSeconds !== null ? Math.round((totalSeconds / totalSlides) * 10) / 10 : null;
          return { name, avgTime, correctAnswers: data.correctAnswersCount || 0 };
        });

        // Sort by correct answers (desc), then avgTime (asc)
        participantsData.sort((a, b) => {
          if (b.correctAnswers !== a.correctAnswers) {
            return b.correctAnswers - a.correctAnswers;
          }
          if (a.avgTime === null) return 1;
          if (b.avgTime === null) return -1;
          return a.avgTime - b.avgTime;
        });

        liveStates[code].participantsData = participantsData;
        io.to(code).emit('live-state-update', liveStates[code]);

        await LivePoll.findOneAndUpdate(
          { surveyCode: code },
          { $set: { liveResults: { participants: state.participants, participantsData, votes: state.votes } } }
        );
      } catch (e) {
        console.error('Failed to save live poll results:', e);
        io.to(code).emit('live-state-update', liveStates[code]);
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
    if (code && name) {
      if (!liveStates[code]) {
        liveStates[code] = { isActive: false, isEnded: false, question: null, votes: {}, participants: [], participantData: {} };
      }
      if (!liveStates[code].participants) liveStates[code].participants = [];
      
      if (!liveStates[code].participants.includes(name)) {
        liveStates[code].participants.push(name);
        // Track join timestamp
        if (!liveStates[code].participantData) liveStates[code].participantData = {};
        liveStates[code].participantData[name] = { joinedAt: Date.now(), lastVoteAt: null };
        io.to(code).emit('live-state-update', liveStates[code]);
      } else {
        socket.emit('live-state-update', liveStates[code]);
      }
    }
  });

  socket.on('submit-vote', ({ code, answer, name }) => {
    const state = liveStates[code];
    if (state && state.isActive && state.question) {
      state.responsesCount = (state.responsesCount || 0) + 1;

      // Track last vote timestamp and correct answers
      if (name && state.participantData && state.participantData[name]) {
        state.participantData[name].lastVoteAt = Date.now();
        if (state.question.correctAnswer && answer === state.question.correctAnswer) {
          state.participantData[name].correctAnswersCount = (state.participantData[name].correctAnswersCount || 0) + 1;
        }
      }

      const type = state.question.type;
      const qId = state.question.id || state.question.pollId; // fallback if id missing
      
      if (!state.votes[qId]) {
        state.votes[qId] = {};
      }
      const slideVotes = state.votes[qId];
      
      if (type === 'scales') {
        try {
          const ratings = JSON.parse(answer);
          Object.entries(ratings).forEach(([optName, val]) => {
            if (!slideVotes[optName]) slideVotes[optName] = { sum: 0, count: 0 };
            slideVotes[optName].sum += val;
            slideVotes[optName].count += 1;
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
            slideVotes[optName] = (slideVotes[optName] || 0) + points;
          });
        } catch(e) { console.error('Error parsing ranking vote:', e); }
      }
      else {
        // multiple_choice, word_cloud, open_ended, qa, etc.
        slideVotes[answer] = (slideVotes[answer] || 0) + 1;
      }

      io.to(code).emit('live-state-update', state); // Update everyone in the room
      io.to(code).emit('vote-animation', { answer, type }); // Trigger animation
    }
  });

  socket.on('chat-message', ({ code, sender, text }) => {
    if (code && sender && text) {
      if (!liveStates[code]) {
        liveStates[code] = { isActive: false, isEnded: false, question: null, votes: {}, participants: [], participantData: {}, chatMessages: [] };
      }
      if (!liveStates[code].chatMessages) {
        liveStates[code].chatMessages = [];
      }
      const message = { id: Date.now().toString(), sender, text, timestamp: new Date() };
      liveStates[code].chatMessages.push(message);
      // Keep only last 50 messages to prevent memory bloat
      if (liveStates[code].chatMessages.length > 50) {
        liveStates[code].chatMessages.shift();
      }
      io.to(code).emit('live-state-update', liveStates[code]);
    }
  });

  socket.on('emoji-reaction', ({ code, emoji }) => {
    if (code && emoji) {
      // Just broadcast the reaction directly so clients can animate it instantly
      io.to(code).emit('emoji-reaction-received', { emoji, timestamp: Date.now() });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api', (req, res) => {
  res.send('SurveySphere API is running');
});

// Frontend serving has been removed. The frontend is hosted separately on Netlify.

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
