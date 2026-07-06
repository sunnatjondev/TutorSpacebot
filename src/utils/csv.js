export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return

  const headers = Object.keys(rows[0])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(field => {
        let val = row[field]
        if (val === null || val === undefined) val = ''
        
        // Escape quotes
        val = String(val).replace(/"/g, '""')
        
        // Wrap in quotes if it contains commas, quotes, or newlines
        if (val.search(/("|,|\n)/g) >= 0) {
          val = `"${val}"`
        }
        return val
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
