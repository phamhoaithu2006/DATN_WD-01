const fs = require('fs')
const { parse } = require('@babel/parser')
const lines = fs.readFileSync('src/pages/admin/GuideManagementPage.jsx', 'utf8').split(/\r?\n/)
function ok(n){
  const code = lines.slice(0,n).join('\n') + '\n'
  try { parse(code,{sourceType:'module',plugins:['jsx']}); return true } catch { return false }
}
let lo = 1, hi = lines.length
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2)
  if (ok(mid)) lo = mid + 1
  else hi = mid
}
console.log('first bad line', lo)
for (let i=Math.max(1,lo-5); i<=Math.min(lines.length,lo+5); i++) console.log(i+': '+lines[i-1])
