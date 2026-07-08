const { getApiKey } = require('./_stt.js')

module.exports = (req, res) => {
  res.json({
    ok: true,
    service: 'voicescript-serverless',
    stateless: true,
    sttConfigured: Boolean(getApiKey()),
  })
}
