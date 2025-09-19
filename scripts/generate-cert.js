// Generate a local self-signed certificate for HTTPS dev/preview
// Usage: npm run cert [host]
// Writes to cert/server.key and cert/server.crt
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import selfsigned from 'selfsigned'

const outDir = path.join(process.cwd(), 'cert')
fs.mkdirSync(outDir, { recursive: true })

const argHost = process.argv[2]
const envHost = process.env.LAN_HOST
const host = argHost || envHost || 'localhost'

function getAltNames(host) {
  const alts = []
  // Always include localhost and loopback
  alts.push({ type: 2, value: 'localhost' })
  alts.push({ type: 7, ip: '127.0.0.1' })
  // Include provided host as DNS or IP
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    alts.push({ type: 7, ip: host })
  } else {
    alts.push({ type: 2, value: host })
  }
  // Also add local IPv4 addresses to be convenient on LAN
  try {
    const ifaces = os.networkInterfaces()
    for (const name of Object.keys(ifaces)) {
      for (const ni of ifaces[name] || []) {
        if (ni.family === 'IPv4' && !ni.internal) {
          alts.push({ type: 7, ip: ni.address })
        }
      }
    }
  } catch {
    // environments without networkInterfaces()
  }
  // Deduplicate
  const seen = new Set()
  return alts.filter((a) => {
    const key = a.type === 7 ? `ip:${a.ip}` : `dns:${a.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const attrs = [{ name: 'commonName', value: host }]
const pems = selfsigned.generate(attrs, {
  days: 825,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [{ name: 'basicConstraints', cA: false }, { name: 'subjectAltName', altNames: getAltNames(host) }],
})

const keyPath = path.join(outDir, 'server.key')
const crtPath = path.join(outDir, 'server.crt')
fs.writeFileSync(keyPath, pems.private)
fs.writeFileSync(crtPath, pems.cert)
console.log('Generated cert files:')
console.log('  Key:', keyPath)
console.log('  Cert:', crtPath)
console.log('\nNext steps:')
console.log('  - Start HTTPS: VITE_USE_HTTPS=1 VITE_SSL_KEY=cert/server.key VITE_SSL_CERT=cert/server.crt npm run dev')
console.log('    Or just: npm run dev (auto-detects cert/ if present)')
console.log('  - On mobile/desktop, trust the certificate to remove warnings (self-signed)')
