const fs = require('fs')
const path = require('path')

const directoryPath = 'd:\\TutorSpace bot\\tutorspace-app\\src'

function walkAndReplace(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      walkAndReplace(fullPath)
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let original = content
      
      // Buttons
      content = content.replace(/\bbtn-primary\b/g, 'm3-btn-filled')
      content = content.replace(/\bbtn-secondary\b/g, 'm3-btn-tonal')
      content = content.replace(/\bbtn-outline\b/g, 'm3-btn-outline')
      content = content.replace(/\bbtn-text\b/g, 'm3-btn-text')
      
      // Cards
      content = content.replace(/\bcard\b(?!\-)/g, 'm3-card')
      content = content.replace(/\bcard-interactive\b/g, 'm3-card-interactive')
      
      // Inputs
      content = content.replace(/\binput-field\b/g, 'm3-input')
      content = content.replace(/\bselect-field\b/g, 'm3-select')
      
      // Fabs
      content = content.replace(/\bfab\b/g, 'm3-fab')

      // Badge to chip is mostly OK but let's keep badge-paid
      
      if (original !== content) {
        fs.writeFileSync(fullPath, content, 'utf8')
        console.log('Updated:', fullPath)
      }
    }
  })
}

walkAndReplace(directoryPath)
console.log('Done replacing classes.')
