const express = require('express');
const router = express.Router();
const { version } = require('../../package.json');

router.get('/health', (req, res) => {
  res.json({ status: 'API está funcionando perfeitamente!', timestamp: new Date() });
});

router.get('/version', (req, res) => {
  res.json({ version });
});

module.exports = router;
