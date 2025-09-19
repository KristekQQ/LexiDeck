// Generates data/sample.xlsx with two sheets and example rows
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

const outDir = path.join(process.cwd(), 'data')
const outPath = path.join(outDir, 'sample.xlsx')
fs.mkdirSync(outDir, { recursive: true })

const basics = [
  ['english', 'translation', 'pronunciationUrl'],
  ['hello', 'ahoj', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3'],
  ['thank you', 'děkuji', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/thank_you--_gb_1.mp3'],
  ['goodbye', 'nashledanou', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/goodbye--_gb_1.mp3']
]

const phrasals = [
  ['english', 'translation', 'pronunciationUrl'],
  ['look up', 'vyhledat', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/look_up--_gb_1.mp3'],
  ['give up', 'vzdát se', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/give_up--_gb_1.mp3'],
  ['carry on', 'pokračovat', 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/carry_on--_gb_1.mp3']
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(basics), 'Basics')
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(phrasals), 'PhrasalVerbs')

XLSX.writeFile(wb, outPath)
console.log('Generated', outPath)

