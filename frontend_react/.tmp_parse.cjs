const fs = require('fs')
const { parse } = require('@babel/parser')
const code = fs.readFileSync('src/pages/admin/GuideManagementPage.jsx', 'utf8')
const b = code.indexOf('{hienForm ? (')
const formStart = code.indexOf('<form className="guide-modal"', b)
const formClose = code.indexOf('</form>', formStart)
const start = b
const end = code.lastIndexOf('      ) : null}', formClose) + 15
const block = code.slice(start, end)
const lines = block.split(/\r?\n/)
const mid = Math.floor(lines.length / 2)
const parts = [
  ['first', lines.slice(0, mid).join('\n')],
  ['second', lines.slice(mid).join('\n')],
]
for (const [name, part] of parts) {
  try {
    parse('const X = (<>' + part + '</>);', { sourceType: 'module', plugins: ['jsx'] })
    console.log(name, 'ok')
  } catch (e) {
    console.log(name, 'ERR', e.message, e.loc)
  }
}
