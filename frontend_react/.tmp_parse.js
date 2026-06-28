const fs = require('fs')
const { parse } = require('@babel/parser')
const code = fs.readFileSync('src/pages/admin/GuideManagementPage.jsx', 'utf8')
const b = code.indexOf('{hienForm ? (')
const start = code.indexOf('<form className="guide-modal"', b)
const end = code.indexOf('      ) : null}', start)
const snippet = 'const X = (<>' + code.slice(b, end + 15) + '</>);'
try {
  parse(snippet, { sourceType: 'module', plugins: ['jsx'] })
  console.log('ok')
} catch (e) {
  console.log(e.message)
  console.log(e.loc)
  const lines = snippet.split(/\r?\n/)
  const line = e.loc.line
  for (let i = Math.max(1, line - 4); i <= Math.min(lines.length, line + 4); i++) {
    console.log(i + ': ' + lines[i - 1])
  }
}
