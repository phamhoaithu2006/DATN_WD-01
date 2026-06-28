const fs = require('fs')
const { parse } = require('@babel/parser')
const lines = fs.readFileSync('src/pages/admin/GuideManagementPage.jsx', 'utf8').split(/\r?\n/)
const start = lines.findIndex(l => l.includes('{hienForm ? ('))
const end = lines.findIndex((l, idx) => idx > start && l.includes('{hdvChiTiet ? (' ))
const snippet = lines.slice(start, end).join('\n')
try {
  parse('function X(){return (' + snippet + ')}', { sourceType: 'module', plugins: ['jsx'] })
  console.log('ok')
} catch (e) {
  console.log(e.message)
  console.log(e.loc)
  const snLines = snippet.split(/\r?\n/)
  const line = e.loc.line
  for (let i = Math.max(1, line - 6); i <= Math.min(snLines.length, line + 6); i++) {
    console.log(i + ': ' + snLines[i - 1])
  }
}
