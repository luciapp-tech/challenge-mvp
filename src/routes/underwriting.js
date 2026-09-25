const express = require('express');
const { validate, decide } = require('../services/underwriting');

const router = express.Router();

router.post('/decision', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Invalid request', details: errors });
  }
  res.json(decide(req.body));
});

module.exports = router;
