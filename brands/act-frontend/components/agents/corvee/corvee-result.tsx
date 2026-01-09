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
import { format, addDays, parse } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CorveeResultProps {
  schema: string;
  weekStart: string;
  className?: string;
}

// Parse markdown tables and extract corvee data
function parseCorveeMarkdown(markdown: string, weekStartStr: string) {
  const weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
  const weekNumber = format(weekStart, 'w');

  // Define the days (ma, di, do) with their dates
  const days = [
    { day: 'ma', date: format(weekStart, 'd-MMM', { locale: nl }) },
    { day: 'di', date: format(addDays(weekStart, 1), 'd-MMM', { locale: nl }) },
    { day: 'do', date: format(addDays(weekStart, 3), 'd-MMM', { locale: nl }) },
  ];

  // Define corvee tasks in order
  const corveeTasks = [
    'Vaatwasser uitruimen',
    'Boodschappen opruimen',
    'Tafel dekken',
    'Tafel afruimen + vuilnis weg',
    'Papier & glasbak legen',
    'Vaatwasser in en uitruimen einde dag',
  ];

  // Try to extract names from the markdown
  // The markdown typically has tables with | Tijd | Taak | Wie | format
  // or day-based sections with task assignments

  const assignments: Record<string, Record<string, string>> = {
    ma: {},
    di: {},
    do: {},
  };

  // Parse the markdown to find assignments
  // Look for patterns like "| 09:15-09:30 | Vaatwasser uitruimen | PersonName |"
  const lines = markdown.split('\n');
  let currentDay = '';

  for (const line of lines) {
    // Check for day headers
    if (line.includes('MAANDAG') || line.toLowerCase().includes('maandag')) {
      currentDay = 'ma';
    } else if (line.includes('DINSDAG') || line.toLowerCase().includes('dinsdag')) {
      currentDay = 'di';
    } else if (line.includes('DONDERDAG') || line.toLowerCase().includes('donderdag')) {
      currentDay = 'do';
    }

    // Parse table rows
    if (line.includes('|') && currentDay) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const taskCell = cells[1]?.toLowerCase() || '';
        const nameCell = cells[2] || '';

        // Match tasks
        for (const task of corveeTasks) {
          if (taskCell.includes(task.toLowerCase().split(' ')[0])) {
            assignments[currentDay][task] = nameCell;
          }
        }
      }
    }
  }

  return { weekNumber, days, corveeTasks, assignments };
}

// Generate Word document with the corvee schema table
async function generateWordDocument(schema: string, weekStart: string) {
  const { weekNumber, days, corveeTasks, assignments } = parseCorveeMarkdown(
    schema,
    weekStart
  );

  const BLUE_COLOR = '3333CC'; // Blue color for day headers

  // Create header row with week number
  const weekHeaderRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `WEEK ${weekNumber}`,
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 4,
        shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
      }),
    ],
  });

  // Create day header row (ma, di, do with dates)
  const dayHeaderRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: '' })],
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      ...days.map(
        ({ day, date }) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: day,
                    bold: true,
                    color: 'FFFFFF',
                    size: 28,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: date,
                    color: 'FFFFFF',
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: BLUE_COLOR, type: ShadingType.CLEAR },
            width: { size: 23, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
      ),
    ],
  });

  // Create "Corvee taak" / "Wie" header row
  const taskHeaderRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Corvee taak', bold: true, size: 20 })],
          }),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      ...days.map(
        () =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Wie', bold: true, size: 20 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
      ),
    ],
  });

  // Create task rows
  const taskRows = corveeTasks.map(
    (task) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: task, size: 20 })],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          ...days.map(
            ({ day }) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: assignments[day]?.[task] || '',
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              })
          ),
        ],
      })
  );

  // Create the table
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [weekHeaderRow, dayHeaderRow, taskHeaderRow, ...taskRows],
  });

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Corvee schema',
                bold: true,
                size: 36,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),
          table,
        ],
      },
    ],
  });

  // Generate and save the document
  const blob = await Packer.toBlob(doc);
  const weekDate = format(parse(weekStart, 'yyyy-MM-dd', new Date()), 'd-MMM-yyyy', {
    locale: nl,
  });
  saveAs(blob, `Corvee_schema_week_${weekNumber}_${weekDate}.docx`);
}

export function CorveeResult({ schema, weekStart, className }: CorveeResultProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [schema]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Corvee Schema - Week ${weekStart}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 2rem; }
              table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
              th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
              th { background: #f5f5f5; }
              h1, h2, h3 { margin-top: 1.5rem; }
            </style>
          </head>
          <body>
            ${schema}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [schema, weekStart]);

  const handleDownloadWord = useCallback(async () => {
    setDownloading(true);
    try {
      await generateWordDocument(schema, weekStart);
    } catch (error) {
      console.error('Failed to generate Word document:', error);
    } finally {
      setDownloading(false);
    }
  }, [schema, weekStart]);

  return (
    <Card className={cn('mt-6', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Gegenereerd Schema</CardTitle>
          <CardDescription>Week van {weekStart}</CardDescription>
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
                  <thead className="bg-muted">{children}</thead>
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
              {schema}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
