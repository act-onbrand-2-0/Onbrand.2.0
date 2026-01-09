'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Printer, FileDown } from 'lucide-react';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface BudgetResultProps {
  budget: string;
  fileName: string;
  className?: string;
}

// Generate Word document from budget data
async function generateWordDocument(budget: string, fileName: string) {
  const projectName = fileName.replace('.pdf', '').replace(/_/g, ' ');
  const today = format(new Date(), 'd MMMM yyyy', { locale: nl });

  const BLUE_COLOR = '3333CC';

  // Parse budget content into sections
  // Try to extract structured data from markdown
  const lines = budget.split('\n');
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Project Budget`,
          bold: true,
          size: 48,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Project name subtitle
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: projectName,
          size: 28,
          color: '666666',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  // Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Gegenereerd: ${today}`,
          size: 20,
          color: '999999',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Process markdown content
  let inTable = false;
  let tableRows: TableRow[] = [];
  let isHeader = true;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      if (inTable && tableRows.length > 0) {
        // End of table, add it
        paragraphs.push(
          new Paragraph({
            children: [],
            spacing: { before: 200 },
          })
        );
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        });
        paragraphs.push(table as unknown as Paragraph);
        tableRows = [];
        inTable = false;
        isHeader = true;
      }
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(2),
              bold: true,
              size: 36,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(3),
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (trimmedLine.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.substring(4),
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    }
    // Table rows
    else if (trimmedLine.startsWith('|') && !trimmedLine.match(/^\|[\s-:|]+\|$/)) {
      inTable = true;
      const cells = trimmedLine
        .split('|')
        .filter((c) => c.trim())
        .map((c) => c.trim());

      tableRows.push(
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        bold: isHeader,
                        size: 20,
                        color: isHeader ? 'FFFFFF' : '000000',
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                shading: isHeader
                  ? { fill: BLUE_COLOR, type: ShadingType.CLEAR }
                  : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              })
          ),
        })
      );
      isHeader = false;
    }
    // Table separator (skip)
    else if (trimmedLine.match(/^\|[\s-:|]+\|$/)) {
      // Skip markdown table separators
      continue;
    }
    // Bullet points
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${trimmedLine.substring(2)}`,
              size: 22,
            }),
          ],
          spacing: { before: 50, after: 50 },
        })
      );
    }
    // Bold text
    else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.slice(2, -2),
              bold: true,
              size: 22,
            }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    }
    // Regular text
    else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 22,
            }),
          ],
          spacing: { before: 50, after: 50 },
        })
      );
    }
  }

  // Add any remaining table
  if (tableRows.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [],
        spacing: { before: 200 },
      })
    );
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });
    paragraphs.push(table as unknown as Paragraph);
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  saveAs(blob, `Budget_${projectName.replace(/\s+/g, '_')}_${dateStr}.docx`);
}

export function BudgetResult({ budget, fileName, className }: BudgetResultProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(budget);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [budget]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Budget - ${fileName}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
              table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
              th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
              th { background: #3333CC; color: white; }
              h1, h2, h3 { margin-top: 1.5rem; color: #333; }
              ul { padding-left: 1.5rem; }
            </style>
          </head>
          <body>
            ${budget}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [budget, fileName]);

  const handleDownloadWord = useCallback(async () => {
    setDownloading(true);
    try {
      await generateWordDocument(budget, fileName);
    } catch (error) {
      console.error('Failed to generate Word document:', error);
    } finally {
      setDownloading(false);
    }
  }, [budget, fileName]);

  return (
    <Card className={cn('mt-6', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Gegenereerd Budget</CardTitle>
          <CardDescription>Gebaseerd op: {fileName}</CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-2">{copied ? 'Gekopieerd!' : 'Kopieer'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span className="ml-2">Print</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadWord}
            disabled={downloading}
          >
            <FileDown className="h-4 w-4" />
            <span className="ml-2">{downloading ? 'Downloaden...' : 'Word'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] rounded-md border p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <table className="min-w-full divide-y divide-border">
                    {children}
                  </table>
                ),
                thead: ({ children }) => (
                  <thead className="bg-primary text-primary-foreground">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left text-sm font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-sm border-t">{children}</td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/50">{children}</tr>
                ),
              }}
            >
              {budget}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
