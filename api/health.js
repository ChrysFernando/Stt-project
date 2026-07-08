const { getApiKey } = require('./_stt.js')
const { isDbConfigured } = require('./_db.js')

module.exports = (req, res) => {
  res.json({
    ok: true,
    service: 'voicescript-serverless',
    db: isDbConfigured(),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    sttConfigured: Boolean(getApiKey()),
  })
}
