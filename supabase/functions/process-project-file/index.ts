import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractText } from "npm:unpdf";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessFileRequest {
  file_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { file_id } = (await req.json()) as ProcessFileRequest;

    if (!file_id) {
      return new Response(
        JSON.stringify({ error: "file_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from("project_files")
      .select("*")
      .eq("id", file_id)
      .single();

    if (fetchError || !fileRecord) {
      return new Response(
        JSON.stringify({ error: "File not found", details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("project_files")
      .update({ status: "processing" })
      .eq("id", file_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("project-files")
      .download(fileRecord.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("project_files")
        .update({ status: "error", error_message: "Failed to download file" })
        .eq("id", file_id);

      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text based on file type
    let extractedText = "";
    const fileType = fileRecord.file_type?.toLowerCase() || "";
    const fileName = fileRecord.name?.toLowerCase() || "";
    const fileExtension = fileName.split(".").pop() || "";
    
    console.log("Processing file:", {
      name: fileRecord.name,
      fileType,
      fileExtension,
      size: fileData.size
    });

    try {
      if (fileType.includes("text/plain") || fileType.includes("text/markdown") || fileExtension === "txt" || fileExtension === "md") {
        // Plain text or markdown - read directly
        extractedText = await fileData.text();
      } else if (fileType.includes("text/csv") || fileExtension === "csv") {
        // CSV - read as text
        extractedText = await fileData.text();
      } else if (fileType.includes("application/json") || fileExtension === "json") {
        // JSON - format nicely
        const jsonText = await fileData.text();
        try {
          const parsed = JSON.parse(jsonText);
          extractedText = JSON.stringify(parsed, null, 2);
        } catch {
          extractedText = jsonText;
        }
      } else if (fileType.includes("pdf") || fileExtension === "pdf") {
        // PDF - extract text
        console.log("Detected PDF file");
        const arrayBuffer = await fileData.arrayBuffer();
        extractedText = await extractTextFromPDF(new Uint8Array(arrayBuffer));
      } else if (
        fileType.includes("msword") ||
        fileType.includes("wordprocessingml") ||
        fileExtension === "docx" ||
        fileExtension === "doc"
      ) {
        // Word documents - extract text
        console.log("Detected Word document, using DOCX extractor");
        const arrayBuffer = await fileData.arrayBuffer();
        extractedText = await extractTextFromDocx(new Uint8Array(arrayBuffer));
      } else if (
        fileType.includes("ms-excel") ||
        fileType.includes("spreadsheetml") ||
        fileExtension === "xlsx" ||
        fileExtension === "xls"
      ) {
        // Excel - extract text from XLSX
        console.log("Detected Excel file");
        const arrayBuffer = await fileData.arrayBuffer();
        extractedText = await extractTextFromXlsx(new Uint8Array(arrayBuffer));
      } else if (
        fileType.includes("ms-powerpoint") ||
        fileType.includes("presentationml") ||
        fileExtension === "pptx" ||
        fileExtension === "ppt"
      ) {
        // PowerPoint - extract text from PPTX
        console.log("Detected PowerPoint file");
        const arrayBuffer = await fileData.arrayBuffer();
        extractedText = await extractTextFromPptx(new Uint8Array(arrayBuffer));
      } else {
        // Unknown type - try reading as text
        try {
          extractedText = await fileData.text();
        } catch {
          extractedText = `[Binary file: ${fileRecord.name}]\nCould not extract text content.`;
        }
      }

      // Truncate if too long (keep first 100k characters)
      const maxLength = 100000;
      if (extractedText.length > maxLength) {
        extractedText = extractedText.substring(0, maxLength) + "\n\n[Content truncated...]";
      }

      // Update file record with extracted text
      const { error: updateError } = await supabase
        .from("project_files")
        .update({
          status: "ready",
          extracted_text: extractedText,
          error_message: null,
        })
        .eq("id", file_id);

      if (updateError) {
        console.error("Failed to update file record:", updateError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to save extracted text", 
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Successfully extracted and saved text for file:", file_id, "length:", extractedText.length);

      return new Response(
        JSON.stringify({
          success: true,
          file_id,
          text_length: extractedText.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (extractError) {
      const errorMessage = extractError instanceof Error ? extractError.message : "Unknown extraction error";
      
      await supabase
        .from("project_files")
        .update({
          status: "error",
          error_message: errorMessage,
        })
        .eq("id", file_id);

      return new Response(
        JSON.stringify({ error: "Failed to extract text", details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Production-grade PDF text extraction using unpdf
async function extractTextFromPDF(data: Uint8Array): Promise<string> {
  try {
    // Use unpdf for production-grade PDF text extraction
    const result = await extractText(data, { mergePages: true });
    
    console.log('unpdf extraction result:', {
      totalPages: result.totalPages,
      textLength: result.text?.length || 0
    });
    
    if (result.text && result.text.trim().length > 50) {
      // Clean up the extracted text
      const cleanedText = result.text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
      
      console.log(`Successfully extracted ${cleanedText.length} characters from ${result.totalPages} pages`);
      return cleanedText;
    }
    
    // If unpdf didn't get much text, try fallback
    console.log('unpdf returned minimal text, trying fallback extraction');
    return await extractTextFromPDFFallback(data);
    
  } catch (error) {
    console.error('unpdf extraction failed:', error);
    // Fall back to manual extraction
    return await extractTextFromPDFFallback(data);
  }
}

// Fallback PDF extraction for edge cases
async function extractTextFromPDFFallback(data: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('latin1');
  const pdfString = decoder.decode(data);
  
  const textParts: string[] = [];
  
  // Try to decompress and extract from FlateDecode streams
  const streamRegex = /<<([^>]*)\/FlateDecode([^>]*)>>\s*stream\r?\n/g;
  const endstreamRegex = /\r?\nendstream/g;
  
  let streamMatch;
  while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
    const streamStart = streamMatch.index + streamMatch[0].length;
    endstreamRegex.lastIndex = streamStart;
    const endMatch = endstreamRegex.exec(pdfString);
    if (!endMatch) continue;
    
    const streamEnd = endMatch.index;
    const streamData = data.slice(streamStart, streamEnd);
    
    try {
      // Try to decompress using DecompressionStream
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      
      writer.write(streamData);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      const content = new TextDecoder('latin1').decode(decompressed);
      
      // Extract text from Tj/TJ operators
      const tjRegex = /\(([^)]*(?:\\.[^)]*)*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(content)) !== null) {
        if (tjMatch[1]) {
          const text = tjMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          if (text.trim()) textParts.push(text);
        }
      }
    } catch {
      // Decompression failed, continue
    }
  }
  
  // Also extract any uncompressed text
  const simpleTextRegex = /\(([^)]{3,})\)\s*Tj/g;
  let simpleMatch;
  while ((simpleMatch = simpleTextRegex.exec(pdfString)) !== null) {
    if (simpleMatch[1]) {
      const text = simpleMatch[1].replace(/\\([nrt()])/g, (_, c) => {
        const escapes: Record<string, string> = { n: '\n', r: '', t: '\t', '(': '(', ')': ')' };
        return escapes[c] || c;
      });
      if (text.trim() && !textParts.includes(text)) {
        textParts.push(text);
      }
    }
  }
  
  // Extract metadata
  const titleMatch = pdfString.match(/\/Title\s*\(([^)]+)\)/);
  const authorMatch = pdfString.match(/\/Author\s*\(([^)]+)\)/);
  
  let metadata = '';
  if (titleMatch?.[1]) metadata += `Title: ${titleMatch[1]}\n`;
  if (authorMatch?.[1]) metadata += `Author: ${authorMatch[1]}\n`;
  
  const result = textParts
    .filter(t => t && t.trim().length > 1)
    .filter(t => {
      const printable = (t.match(/[\x20-\x7E]/g) || []).length;
      return printable / t.length > 0.7;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (result.length < 50) {
    return `[PDF file - limited extraction]\n${metadata}\nThe PDF uses compression or fonts that couldn't be fully processed.\n\nPartial content:\n${result.substring(0, 500)}`;
  }
  
  return metadata ? `${metadata}\n${result}` : result;
}

// Production-grade DOCX text extraction using JSZip
async function extractTextFromDocx(data: Uint8Array): Promise<string> {
  try {
    // DOCX files are ZIP archives containing XML files
    const zip = await JSZip.loadAsync(data);
    
    // The main document content is in word/document.xml
    const documentXml = zip.file("word/document.xml");
    
    if (!documentXml) {
      console.error("No document.xml found in DOCX");
      return "[Word document - invalid format]\nCould not find document content in the DOCX file.";
    }
    
    const xmlContent = await documentXml.async("string");
    
    // Extract text from Word XML
    const textParts: string[] = [];
    
    // Match text content in <w:t> tags (Word text elements)
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = textRegex.exec(xmlContent)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }
    
    // Also try to extract from headers/footers if available
    const headerFiles = Object.keys(zip.files).filter(name => 
      name.startsWith("word/header") && name.endsWith(".xml")
    );
    const footerFiles = Object.keys(zip.files).filter(name => 
      name.startsWith("word/footer") && name.endsWith(".xml")
    );
    
    // Process headers
    for (const headerFile of headerFiles) {
      const headerXml = await zip.file(headerFile)?.async("string");
      if (headerXml) {
        const headerRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        while ((match = headerRegex.exec(headerXml)) !== null) {
          if (match[1] && !textParts.includes(match[1])) {
            textParts.unshift(match[1]);
          }
        }
      }
    }
    
    // Process footers
    for (const footerFile of footerFiles) {
      const footerXml = await zip.file(footerFile)?.async("string");
      if (footerXml) {
        const footerRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        while ((match = footerRegex.exec(footerXml)) !== null) {
          if (match[1] && !textParts.includes(match[1])) {
            textParts.push(match[1]);
          }
        }
      }
    }
    
    // Reconstruct document with paragraph awareness
    // Split by paragraph markers to maintain structure
    const structuredText = reconstructDocxParagraphs(xmlContent);
    
    if (structuredText.length > 50) {
      console.log(`Successfully extracted ${structuredText.length} characters from DOCX`);
      return structuredText;
    }
    
    // Fallback to simple join if structured extraction didn't work well
    const simpleResult = textParts.join(" ").replace(/\s+/g, " ").trim();
    
    if (simpleResult.length > 50) {
      console.log(`Extracted ${simpleResult.length} characters from DOCX (simple method)`);
      return simpleResult;
    }
    
    return `[Word document - minimal content]\nExtracted text: ${simpleResult.substring(0, 500)}`;
    
  } catch (error) {
    console.error("DOCX extraction failed:", error);
    return await extractTextFromDocxFallback(data);
  }
}

// Reconstruct paragraphs from DOCX XML maintaining structure
function reconstructDocxParagraphs(xmlContent: string): string {
  const paragraphs: string[] = [];
  
  // Match paragraph elements <w:p>...</w:p>
  const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs;
  let pMatch;
  
  while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paragraphContent = pMatch[1];
    const textParts: string[] = [];
    
    // Extract all text from this paragraph
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = textRegex.exec(paragraphContent ?? "")) !== null) {
      const textContent = tMatch[1];
      if (textContent !== undefined && textContent !== "") {
        textParts.push(textContent);
      }
    }
    
    const paragraphText = textParts.join("").trim();
    if (paragraphText) {
      paragraphs.push(paragraphText);
    }
  }
  
  return paragraphs.join("\n\n").trim();
}

// Fallback DOCX extraction for corrupted or non-standard files
async function extractTextFromDocxFallback(data: Uint8Array): Promise<string> {
  try {
    // Try to decode raw bytes and look for text patterns
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(data);
    
    const textParts: string[] = [];
    
    // Look for Word text elements in raw data
    const textRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text && text.length > 0) {
        textParts.push(text);
      }
    }
    
    // If no Word XML found, try generic text extraction
    if (textParts.length === 0) {
      const asciiRegex = /[\x20-\x7E]{10,}/g;
      while ((match = asciiRegex.exec(content)) !== null) {
        const text = match[0].trim();
        if (text && !text.includes("<?xml") && !text.includes("xmlns") && !text.includes("Content-Type")) {
          textParts.push(text);
        }
      }
    }
    
    const result = textParts.join(" ").replace(/\s+/g, " ").trim();
    
    if (result.length < 100) {
      return `[Word document - limited extraction]\nThe document structure couldn't be fully parsed.\n\nExtracted content: ${result.substring(0, 500)}`;
    }
    
    return result;
  } catch (error) {
    return `[Word document - extraction failed]\nUnable to extract text from this Word document. Please try saving as PDF or plain text.`;
  }
}

// Production-grade XLSX text extraction using JSZip
async function extractTextFromXlsx(data: Uint8Array): Promise<string> {
  try {
    // XLSX files are ZIP archives containing XML files
    const zip = await JSZip.loadAsync(data);
    
    // Get shared strings (text values are stored here)
    const sharedStringsFile = zip.file("xl/sharedStrings.xml");
    const sharedStrings: string[] = [];
    
    if (sharedStringsFile) {
      const ssContent = await sharedStringsFile.async("string");
      // Extract text from <t> tags within <si> elements
      const stringRegex = /<si[^>]*>.*?<t[^>]*>([^<]*)<\/t>.*?<\/si>/gs;
      let match;
      while ((match = stringRegex.exec(ssContent)) !== null) {
        if (match[1]) {
          sharedStrings.push(match[1]);
        }
      }
      // Also handle simpler <t> tags
      if (sharedStrings.length === 0) {
        const simpleRegex = /<t[^>]*>([^<]+)<\/t>/g;
        while ((match = simpleRegex.exec(ssContent)) !== null) {
          if (match[1]) {
            sharedStrings.push(match[1]);
          }
        }
      }
    }
    
    // Get workbook to find sheet names
    const workbookFile = zip.file("xl/workbook.xml");
    const sheetNames: string[] = [];
    
    if (workbookFile) {
      const wbContent = await workbookFile.async("string");
      const sheetRegex = /<sheet[^>]*name="([^"]+)"[^>]*>/g;
      let match;
      while ((match = sheetRegex.exec(wbContent)) !== null) {
        if (match[1]) {
          sheetNames.push(match[1]);
        }
      }
    }
    
    // Process each worksheet
    const sheetFiles = Object.keys(zip.files).filter(name => 
      name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml")
    ).sort();
    
    const allSheetData: string[] = [];
    
    for (let i = 0; i < sheetFiles.length; i++) {
      const sheetFile = zip.file(sheetFiles[i]);
      if (!sheetFile) continue;
      
      const sheetContent = await sheetFile.async("string");
      const sheetName = sheetNames[i] || `Sheet ${i + 1}`;
      
      // Parse rows and cells
      const rows: string[][] = [];
      const rowRegex = /<row[^>]*>(.*?)<\/row>/gs;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(sheetContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        
        // Match cells - they have <v> for value and may reference shared strings
        const cellRegex = /<c[^>]*(?:t="s")?[^>]*>.*?<v>([^<]*)<\/v>.*?<\/c>/gs;
        
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent ?? "")) !== null) {
          const valueIndex = cellMatch[1] ?? "";
          // Check if this is a shared string reference
          const cellTag = cellMatch[0];
          if (cellTag.includes('t="s"') && sharedStrings.length > 0) {
            const idx = parseInt(valueIndex, 10);
            if (!isNaN(idx) && idx < sharedStrings.length) {
              const sharedValue = sharedStrings[idx];
              if (sharedValue) cells.push(sharedValue);
            } else if (valueIndex) {
              cells.push(valueIndex);
            }
          } else if (valueIndex) {
            cells.push(valueIndex);
          }
        }
        
        // Also try to get inline strings
        const inlineRegex = /<is><t>([^<]*)<\/t><\/is>/g;
        while ((cellMatch = inlineRegex.exec(rowContent ?? "")) !== null) {
          const inlineText = cellMatch[1];
          if (inlineText) {
            cells.push(inlineText);
          }
        }
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      
      // Format sheet data as text table
      if (rows.length > 0) {
        const sheetText = `=== ${sheetName} ===\n` + 
          rows.map(row => row.join("\t")).join("\n");
        allSheetData.push(sheetText);
      }
    }
    
    if (allSheetData.length > 0) {
      const result = allSheetData.join("\n\n");
      console.log(`Successfully extracted ${result.length} characters from XLSX with ${sheetFiles.length} sheets`);
      return result;
    }
    
    // If structured extraction failed, return shared strings as fallback
    if (sharedStrings.length > 0) {
      const result = `[Excel spreadsheet]\n\nExtracted text values:\n${sharedStrings.join("\n")}`;
      console.log(`Extracted ${sharedStrings.length} shared strings from XLSX`);
      return result;
    }
    
    return "[Excel spreadsheet - minimal content]\nNo text content could be extracted from this spreadsheet.";
    
  } catch (error) {
    console.error("XLSX extraction failed:", error);
    return await extractTextFromXlsxFallback(data);
  }
}

// Fallback XLSX extraction for corrupted or non-standard files
async function extractTextFromXlsxFallback(data: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(data);
    
    const textParts: string[] = [];
    
    // Look for text in <t> tags
    const textRegex = /<t[^>]*>([^<]+)<\/t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 0 && !text.startsWith("<?xml")) {
        textParts.push(text);
      }
    }
    
    // Look for cell values
    const valueRegex = /<v>([^<]+)<\/v>/g;
    while ((match = valueRegex.exec(content)) !== null) {
      const value = match[1]?.trim();
      if (value && !textParts.includes(value)) {
        textParts.push(value);
      }
    }
    
    if (textParts.length > 0) {
      const result = `[Excel spreadsheet]\n\n${textParts.join("\n")}`;
      return result;
    }
    
    return "[Excel spreadsheet - extraction failed]\nUnable to extract text from this Excel file. Please try saving as CSV.";
  } catch (error) {
    return "[Excel spreadsheet - extraction failed]\nUnable to extract text from this Excel file. Please try saving as CSV.";
  }
}

// Production-grade PPTX text extraction using JSZip
async function extractTextFromPptx(data: Uint8Array): Promise<string> {
  try {
    // PPTX files are ZIP archives containing XML files
    const zip = await JSZip.loadAsync(data);
    
    // Get all slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
      .sort((a, b) => {
        // Sort numerically by slide number
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
        return numA - numB;
      });
    
    const allSlideContent: string[] = [];
    
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = zip.file(slideFiles[i]);
      if (!slideFile) continue;
      
      const slideContent = await slideFile.async("string");
      const slideNumber = i + 1;
      
      // Extract text from PowerPoint XML
      const textParts: string[] = [];
      
      // Match text in <a:t> tags (PowerPoint text elements)
      const textRegex = /<a:t>([^<]*)<\/a:t>/g;
      let match;
      while ((match = textRegex.exec(slideContent)) !== null) {
        const text = match[1];
        if (text !== undefined && text.trim()) {
          textParts.push(text);
        }
      }
      
      // Reconstruct with paragraph awareness
      const structuredText = reconstructPptxParagraphs(slideContent);
      
      if (structuredText.length > 0) {
        allSlideContent.push(`=== Slide ${slideNumber} ===\n${structuredText}`);
      } else if (textParts.length > 0) {
        allSlideContent.push(`=== Slide ${slideNumber} ===\n${textParts.join(" ")}`);
      }
    }
    
    // Also extract from slide notes if available
    const notesFiles = Object.keys(zip.files)
      .filter(name => name.startsWith("ppt/notesSlides/") && name.endsWith(".xml"))
      .sort();
    
    const notesContent: string[] = [];
    for (const notesFile of notesFiles) {
      const notes = zip.file(notesFile);
      if (!notes) continue;
      
      const notesXml = await notes.async("string");
      const noteTexts: string[] = [];
      
      const textRegex = /<a:t>([^<]*)<\/a:t>/g;
      let match;
      while ((match = textRegex.exec(notesXml)) !== null) {
        const text = match[1];
        if (text !== undefined && text.trim()) {
          noteTexts.push(text);
        }
      }
      
      if (noteTexts.length > 0) {
        const slideNum = notesFile.match(/notesSlide(\d+)/)?.[1] ?? "?";
        notesContent.push(`[Notes for Slide ${slideNum}]: ${noteTexts.join(" ")}`);
      }
    }
    
    // Combine slides and notes
    let result = allSlideContent.join("\n\n");
    
    if (notesContent.length > 0) {
      result += "\n\n=== Speaker Notes ===\n" + notesContent.join("\n");
    }
    
    if (result.length > 50) {
      console.log(`Successfully extracted ${result.length} characters from PPTX with ${slideFiles.length} slides`);
      return result;
    }
    
    return "[PowerPoint presentation - minimal content]\nNo text content could be extracted from this presentation.";
    
  } catch (error) {
    console.error("PPTX extraction failed:", error);
    return await extractTextFromPptxFallback(data);
  }
}

// Reconstruct paragraphs from PowerPoint XML maintaining structure
function reconstructPptxParagraphs(xmlContent: string): string {
  const paragraphs: string[] = [];
  
  // Match paragraph elements <a:p>...</a:p>
  const paragraphRegex = /<a:p[^>]*>(.*?)<\/a:p>/gs;
  let pMatch;
  
  while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paragraphContent = pMatch[1];
    const textParts: string[] = [];
    
    // Extract all text from this paragraph
    const textRegex = /<a:t>([^<]*)<\/a:t>/g;
    let tMatch;
    while ((tMatch = textRegex.exec(paragraphContent ?? "")) !== null) {
      const textContent = tMatch[1];
      if (textContent !== undefined && textContent !== "") {
        textParts.push(textContent);
      }
    }
    
    const paragraphText = textParts.join("").trim();
    if (paragraphText) {
      paragraphs.push(paragraphText);
    }
  }
  
  return paragraphs.join("\n").trim();
}

// Fallback PPTX extraction for corrupted or non-standard files
async function extractTextFromPptxFallback(data: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(data);
    
    const textParts: string[] = [];
    
    // Look for text in <a:t> tags
    const textRegex = /<a:t>([^<]+)<\/a:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 0) {
        textParts.push(text);
      }
    }
    
    if (textParts.length > 0) {
      const result = `[PowerPoint presentation]\n\n${textParts.join("\n")}`;
      return result;
    }
    
    return "[PowerPoint presentation - extraction failed]\nUnable to extract text from this PowerPoint file.";
  } catch (error) {
    return "[PowerPoint presentation - extraction failed]\nUnable to extract text from this PowerPoint file.";
  }
}
