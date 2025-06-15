const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType } = require('docx')
const fs = require('fs')

/**
 * @typedef {Object} TestResult
 * @property {string} testCaseId
 * @property {string} butirUji
 * @property {string[]} prosedurPengujian
 * @property {string[]} masukan
 * @property {string} keluaranDiharapkan
 * @property {string} keluaranDidapat
 * @property {string} kesimpulan
 */

/**
 * Generate a DOCX file for test results in Indonesian format
 * @param {TestResult[]} results
 * @param {string} outputPath
 */
function exportTestResultDocx(results, outputPath) {
    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Test Case ID', italics: true })] })] }),
                new TableCell({ children: [new Paragraph('Butir Uji')] }),
                new TableCell({ children: [new Paragraph('Prosedur Pengujian')] }),
                new TableCell({ children: [new Paragraph('Masukan')] }),
                new TableCell({ children: [new Paragraph('Keluaran yang Diharapkan')] }),
                new TableCell({ children: [new Paragraph('Keluaran yang Didapat')] }),
                new TableCell({ children: [new Paragraph('Kesimpulan')] })
            ]
        })
    ]

    results.forEach(result => {
        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(result.testCaseId)] }),
                    new TableCell({ children: [new Paragraph(result.butirUji)] }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: result.prosedurPengujian.map((step, idx) => new TextRun({
                                    text: `${idx + 1}. ${step}`,
                                    break: idx > 0
                                }))
                            })
                        ]
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: result.masukan.map((input, idx) => new TextRun({
                                    text: `• ${input}`,
                                    italics: input.includes('Email') || input.includes('Password'),
                                    break: idx > 0
                                }))
                            })
                        ]
                    }),
                    new TableCell({ children: [new Paragraph(result.keluaranDiharapkan)] }),
                    new TableCell({ children: [new Paragraph(result.keluaranDidapat)] }),
                    new TableCell({ children: [new Paragraph(result.kesimpulan)] })
                ]
            })
        )
    })

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({
                        text: 'Tabel Hasil Pengujian',
                        heading: 'Heading1',
                        alignment: AlignmentType.CENTER
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows
                    })
                ]
            }
        ]
    })

    Packer.toBuffer(doc).then(buffer => {
        fs.writeFileSync(outputPath, buffer)
        console.log('DOCX file created at', outputPath)
    })
}

module.exports = exportTestResultDocx 