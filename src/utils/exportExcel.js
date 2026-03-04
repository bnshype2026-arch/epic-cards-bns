import * as XLSX from 'xlsx'

/**
 * Shared utility to export data to an Excel file with stylized column headers.
 * @param {Array<Object>} data - The array of objects to export.
 * @param {string} filename - The name of the file to download (without extension).
 */
export const exportToExcel = (data, filename) => {
    // 1. Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()

    // 2. Adjust column widths
    const minColWidth = 10
    const colWidths = []

    data.forEach(row => {
        Object.keys(row).forEach((key, i) => {
            const keyLen = String(key).length
            const valLen = String(row[key] || '').length
            const maxLen = Math.max(keyLen, valLen)

            if (!colWidths[i] || maxLen > colWidths[i]) {
                colWidths[i] = Math.max(maxLen, minColWidth)
            }
        })
    })

    // Cap the maximum width to prevent absurdly wide columns
    worksheet['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 2, 50) }))

    // 3. Append the worksheet and write the file
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ExportData')
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
