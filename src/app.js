const express = require('express');
const underwritingRouter = require('./routes/underwriting');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/underwriting', underwritingRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Malformed JSON bodies and other unhandled errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
