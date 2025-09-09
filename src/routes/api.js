const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'API está funcionando perfeitamente!', timestamp: new Date() });
});

module.exports = router;
