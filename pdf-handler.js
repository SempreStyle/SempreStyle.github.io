// PDF Handler for Vacation Rental Management System

// Import PDF.js library
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Helper function to format dates consistently
function formatDate(dateStr) {
    // Handle different date formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
    const parts = dateStr.split(/[\/.-]/);
    
    // Check if we have day, month, year in the correct order
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        
        // Handle 2-digit years
        if (year.length === 2) {
            year = '20' + year; // Assume 21st century
        }
        
        // Return in YYYY-MM-DD format for HTML date inputs
        return `${year}-${month}-${day}`;
    }
    
    // If we can't parse it, return as is
    return dateStr;
}

// Function to handle file input change
window.handlePDFUpload = async function(file) {
    try {
        console.log('Starting PDF upload process...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
        
        const result = await extractPropertyData(pdf);
        console.log('PDF data extraction result:', result);
        
        if (result && result.success) {
            // Ensure result.data is always an array
            const entries = Array.isArray(result.data) ? result.data : [result.data];
            console.log(`Found ${entries.length} entries to process`);
            
            // Filter out entries without dates
            const validEntries = entries.filter(entry => entry.fechaEntrada || entry.fechaSalida);
            const invalidEntries = entries.length - validEntries.length;
            
            if (validEntries.length > 0) {
                try {
                    console.log('Processing entries:', validEntries);
                    registerProperty(validEntries);
                    console.log('Entries registered successfully');
                } catch (error) {
                    console.error('Error registering entries:', error);
                    return {
                        success: false,
                        message: 'Error al registrar las entradas: ' + error.message
                    };
                }
            }
            
            const message = `Se han registrado ${validEntries.length} entradas correctamente${invalidEntries > 0 ? ` (${invalidEntries} entradas no válidas)` : ''}.`;
            
            return { 
                success: true,
                message: message
            };
        } else {
            console.warn('No valid entries found in PDF');
            return { 
                success: false, 
                message: 'No se pudieron extraer fechas del PDF. Por favor, verifica que el PDF contenga fechas de entrada o salida.'
            };
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        return { 
            success: false, 
            message: 'Error al procesar el PDF: ' + error.message 
        };
    }
}

// Extract property data from PDF
async function extractPropertyData(pdf) {
    try {
        const numPages = pdf.numPages;
        let text = '';
        
        // Extract text from all pages with improved tabular format preservation
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            // Sort items by vertical position (y-coordinate) to maintain reading order
            const sortedItems = content.items.sort((a, b) => {
                // Sort primarily by y-coordinate (vertical position)
                const yDiff = b.transform[5] - a.transform[5];
                if (Math.abs(yDiff) > 2) return yDiff;
                
                // If on same line, sort by x-coordinate (horizontal position)
                return a.transform[4] - b.transform[4];
            });
            
            let lastY;
            let currentLine = [];
            
            // Group items by their y-coordinate to preserve table rows
            sortedItems.forEach(item => {
                const currentY = Math.round(item.transform[5]);
                if (lastY !== undefined && Math.abs(lastY - currentY) > 5) {
                    // New line detected, join current line items and add to text
                    text += currentLine.join(' ') + '\n';
                    currentLine = [];
                }
                currentLine.push(item.str);
                lastY = currentY;
            });
            
            // Add last line if any items remain
            if (currentLine.length > 0) {
                text += currentLine.join(' ') + '\n';
            }
        }
        
        console.log('Extracted text from PDF:', text.substring(0, 500) + '...');
        
        // Try both parsing methods and use the one that finds dates
        const multipleResult = parsePropertyTextMultiple(text);
        if (multipleResult.success) {
            return multipleResult;
        }
        
        // Fall back to single entry parsing if multiple parsing fails
        const singleResult = parsePropertyText(text);
        return singleResult;
    } catch (error) {
        console.error('Error extracting PDF data:', error);
        return {
            success: false,
            message: 'Error al extraer datos del PDF: ' + error.message
        };
    }
}

// Parse extracted text to find multiple property entries
function parsePropertyTextMultiple(text) {
    // Regular expressions for property data with more flexible patterns
    const patterns = {
        propertyName: /RELACIÓN\s+DE\s+RESERVAS\s+APARTAMENTO\s+([A-Z]-\d+)/i,
        checkIn: /(?:Entrada|Check[\s-]*in|Llegada|Arrival|Fecha[\s-]*de[\s-]*entrada|IN)[:;]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
        checkOut: /(?:Salida|Check[\s-]*out|Partida|Departure|Fecha[\s-]*de[\s-]*salida|OUT)[:;]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
        extras: /(?:COMENTARIO|Observaciones|Notas|Notes|Comments|Remarks)[:;]?\s*([^\n\r]+)/i,
        // Enhanced date pattern to catch more date formats
        tableDate: /\b(\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{2}|\d{4}))\b/g,
        // Pattern to match month names in Spanish and English
        monthDate: /\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:de\s+)?(\d{4}|\d{2}))?\b/gi,
        rowPattern: /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:[^\n\r]*?)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/g,
        // Pattern specifically for tabular data with ENTRADA and SALIDA columns
        tableRowPattern: /ENTRADA[\s\n\r]*([\d\/.-]+)[\s\n\r]*SALIDA[\s\n\r]*([\d\/.-]+)/gi,
        // New pattern to detect adjacent date pairs in a table format
        adjacentDatePairs: /\b(\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{2}|\d{4}))\s*[\t|]*\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{2}|\d{4}))\b/gm,
        // Additional patterns for more date formats
        dateWithText: /(?:día|day|date|fecha|from|to|desde|hasta)\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{2}|\d{4}))/i,
        dateInBrackets: /[\[(](\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{2}|\d{4}))[\])]/g,
        dateWithDash: /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\b/g
    };
    
    const entries = [];
    
    // Extract property name (optional)
    const propertyNameMatch = text.match(patterns.propertyName);
    let propertyName = propertyNameMatch ? propertyNameMatch[1].trim() : 'Unknown';
    
    // If property name not found, try to extract from filename or other text
    if (propertyName === 'Unknown') {
        // Look for A-4, A-11, C-13, C-17 patterns anywhere in the text
        const apartmentMatch = text.match(/\b([A-Z]-\d+)\b/);
        if (apartmentMatch) {
            propertyName = apartmentMatch[1];
        }
    }
    
    // Format property name if available
    let formattedPropertyName = propertyName;
    if (formattedPropertyName.includes('A-4') || text.toLowerCase().includes('a-4') || text.toLowerCase().includes('a4')) {
        formattedPropertyName = 'La perla A4';
    } else if (formattedPropertyName.includes('A-11') || text.toLowerCase().includes('a-11') || text.toLowerCase().includes('a11')) {
        formattedPropertyName = 'La perla A11';
    } else if (formattedPropertyName.includes('C-13') || text.toLowerCase().includes('c-13') || text.toLowerCase().includes('c13')) {
        formattedPropertyName = 'La perla C13';
    } else if (formattedPropertyName.includes('C-17') || text.toLowerCase().includes('c-17') || text.toLowerCase().includes('c17')) {
        formattedPropertyName = 'La perla C17';
    }
    
    // Extract extras (optional)
    let extrasText = '';
    const comentarioIndex = text.indexOf('COMENTARIO');
    const limpiezaIndex = text.indexOf('LIMPIEZA');
    
    if (comentarioIndex > 0) {
        const comentarioEndIndex = limpiezaIndex > 0 ? limpiezaIndex : text.length;
        const comentarioSection = text.substring(comentarioIndex, comentarioEndIndex);
        const extrasMatch = comentarioSection.match(/COMENTARIO[\s\n\r]+(.*?)(?=[\n\r]\s*[A-Z]{3,}|$)/s);
        if (extrasMatch && extrasMatch[1]) {
            extrasText = extrasMatch[1].trim();
        }
    } else {
        const extrasMatch = text.match(patterns.extras);
        if (extrasMatch) {
            extrasText = extrasMatch[1].trim();
        }
    }
    
    const extras = extrasText ? extrasText.split(/[,;]/).map(e => e.trim()) : [];
    
    // Try to extract dates from tabular format
    // Look for various forms of "entrada" and "salida" in the text
    const entradaKeywords = ['entrada', 'check-in', 'checkin', 'check in', 'llegada', 'arrival', 'in'];
    const salidaKeywords = ['salida', 'check-out', 'checkout', 'check out', 'partida', 'departure', 'out'];
    
    // Find all occurrences of entrada and salida keywords
    let entradaIndices = [];
    let salidaIndices = [];
    
    // Find all occurrences of entrada keywords
    for (const keyword of entradaKeywords) {
        let index = text.toLowerCase().indexOf(keyword);
        while (index !== -1) {
            entradaIndices.push(index);
            index = text.toLowerCase().indexOf(keyword, index + 1);
        }
    }
    
    // Find all occurrences of salida keywords
    for (const keyword of salidaKeywords) {
        let index = text.toLowerCase().indexOf(keyword);
        while (index !== -1) {
            salidaIndices.push(index);
            index = text.toLowerCase().indexOf(keyword, index + 1);
        }
    }
    
    // Sort indices to maintain order
    entradaIndices.sort((a, b) => a - b);
    salidaIndices.sort((a, b) => a - b);
    
    // Use the first occurrence if no other matches found
    let entradaIndex = entradaIndices.length > 0 ? entradaIndices[0] : -1;
    let salidaIndex = salidaIndices.length > 0 ? salidaIndices[0] : -1;
    
    const nochesIndex = text.toLowerCase().indexOf('noches');
    const clienteIndex = text.toLowerCase().indexOf('cliente');
    const paisIndex = text.toLowerCase().indexOf('país') !== -1 ? 
                     text.toLowerCase().indexOf('país') : 
                     text.toLowerCase().indexOf('pais');
    
    // Log extracted text for debugging
    console.log('PDF Text (excerpt):', text.substring(0, 200) + '...');
    console.log('Entrada index:', entradaIndex);
    console.log('Salida index:', salidaIndex);
    
    // Look for adjacent date pairs in tabular format (like in the image)
    const adjacentPairs = [...text.matchAll(patterns.adjacentDatePairs)];
    console.log(`Found ${adjacentPairs.length} adjacent date pairs`);
    
    if (adjacentPairs.length > 0) {
        // Process each pair of adjacent dates as an entry
        adjacentPairs.forEach(match => {
            const entradaDate = formatDate(match[1].trim());
            const salidaDate = formatDate(match[2].trim());
            
            // Check if this exact date pair already exists in entries
            const alreadyExists = entries.some(entry => 
                entry.fechaEntrada === entradaDate && entry.fechaSalida === salidaDate);
            
            if (!alreadyExists) {
                const entry = {
                    vivienda: formattedPropertyName,
                    fechaEntrada: entradaDate,
                    horaEntrada: '',
                    fechaSalida: salidaDate,
                    horaSalida: '',
                    horasLimpiadora: 2,
                    extras: extras
                };
                entries.push(entry);
                console.log(`Added adjacent pair entry: ${entradaDate} - ${salidaDate}`);
            }
        });
    }
    
    // Improved extraction for tabular format
    if (entradaIndex > 0 && salidaIndex > 0) {
        // Get sections
        const entradaEndIndex = salidaIndex;
        const salidaEndIndex = nochesIndex > 0 ? nochesIndex : (comentarioIndex > 0 ? comentarioIndex : text.length);
        
        const entradaSection = text.substring(entradaIndex, entradaEndIndex);
        const salidaSection = text.substring(salidaIndex, salidaEndIndex);
        
        console.log('Entrada section:', entradaSection);
        console.log('Salida section:', salidaSection);
        
        // Extract all dates from each section
        const entradaDates = [...entradaSection.matchAll(patterns.tableDate)];
        const salidaDates = [...salidaSection.matchAll(patterns.tableDate)];
        
        // Also try to match dates with month names
        const entradaMonthDates = [...entradaSection.matchAll(patterns.monthDate)];
        const salidaMonthDates = [...salidaSection.matchAll(patterns.monthDate)];
        
        // Convert month name dates to standard format and add to date arrays
        if (entradaMonthDates.length > 0) {
            entradaMonthDates.forEach(match => {
                const day = match[1];
                const month = {
                    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
                }[match[2].toLowerCase()];
                const year = match[3] ? match[3].length === 2 ? '20' + match[3] : match[3] : new Date().getFullYear().toString();
                const dateStr = `${day}/${month}/${year}`;
                entradaDates.push([null, dateStr]);
            });
        }
        
        if (salidaMonthDates.length > 0) {
            salidaMonthDates.forEach(match => {
                const day = match[1];
                const month = {
                    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
                }[match[2].toLowerCase()];
                const year = match[3] ? match[3].length === 2 ? '20' + match[3] : match[3] : new Date().getFullYear().toString();
                const dateStr = `${day}/${month}/${year}`;
                salidaDates.push([null, dateStr]);
            });
        }
        
        console.log('Entrada dates found:', entradaDates.length);
        console.log('Salida dates found:', salidaDates.length);
        
        // Skip the first date if it appears in the header (e.g., if 'ENTRADA' has a date next to it)
        const skipFirstEntrada = entradaSection.indexOf('ENTRADA') < 20 && entradaDates.length > 0 && 
                               entradaSection.indexOf(entradaDates[0][0]) < 20;
        const skipFirstSalida = salidaSection.indexOf('SALIDA') < 20 && salidaDates.length > 0 && 
                              salidaSection.indexOf(salidaDates[0][0]) < 20;
        
        const startEntradaIndex = skipFirstEntrada ? 1 : 0;
        const startSalidaIndex = skipFirstSalida ? 1 : 0;
        
        const filteredEntradaDates = entradaDates.slice(startEntradaIndex);
        const filteredSalidaDates = salidaDates.slice(startSalidaIndex);
        
        if (filteredEntradaDates.length > 0 || filteredSalidaDates.length > 0) {
            const maxLength = Math.max(filteredEntradaDates.length, filteredSalidaDates.length);
            
            // Extract client names if available
            let clientNames = [];
            if (clienteIndex > 0 && paisIndex > 0) {
                const clienteSection = text.substring(clienteIndex, paisIndex);
                // Remove the 'CLIENTE:' header
                const clienteContent = clienteSection.replace(/CLIENTE\s*:?/i, '').trim();
                // Split by line breaks or multiple spaces
                clientNames = clienteContent.split(/[\n\r]+|\s{2,}/).filter(name => name.trim().length > 0);
            }
            
            // Create entries for each row in the table
            for (let i = 0; i < maxLength; i++) {
                const clientName = i < clientNames.length ? clientNames[i] : '';
                let clientExtras = extras;
                
                // If we have client-specific extras in the COMENTARIO section, try to match them
                if (clientName && extrasText) {
                    // This is a simplified approach - in a real scenario, you might need more sophisticated matching
                    const clientExtrasMatch = new RegExp(`${clientName}[^\n\r]*?([^\n\r]+)`, 'i').exec(extrasText);
                    if (clientExtrasMatch) {
                        clientExtras = clientExtrasMatch[1].split(/[,;]/).map(e => e.trim());
                    }
                }
                
                const entry = {
                    vivienda: formattedPropertyName,
                    fechaEntrada: i < filteredEntradaDates.length ? formatDate(filteredEntradaDates[i][1].trim()) : '',
                    horaEntrada: '',
                    fechaSalida: i < filteredSalidaDates.length ? formatDate(filteredSalidaDates[i][1].trim()) : '',
                    horaSalida: '',
                    horasLimpiadora: 2,
                    extras: clientExtras
                };
                
                if (entry.fechaEntrada || entry.fechaSalida) {
                    entries.push(entry);
                    console.log(`Added entry: ${entry.fechaEntrada} - ${entry.fechaSalida}`);
                }
            }
            
            // Also try to extract dates directly from the table rows
            const rowMatches = [...text.matchAll(patterns.rowPattern)];
            console.log(`Found ${rowMatches.length} direct row matches`);
            
            if (rowMatches.length > 0) {
                rowMatches.forEach(match => {
                    // Check if this date pair is already included in our entries
                    const entradaDate = formatDate(match[1].trim());
                    const salidaDate = formatDate(match[2].trim());
                    
                    // Check if this exact date pair already exists in entries
                    const alreadyExists = entries.some(entry => 
                        entry.fechaEntrada === entradaDate && entry.fechaSalida === salidaDate);
                    
                    if (!alreadyExists) {
                        const entry = {
                            vivienda: formattedPropertyName,
                            fechaEntrada: entradaDate,
                            horaEntrada: '',
                            fechaSalida: salidaDate,
                            horaSalida: '',
                            horasLimpiadora: 2,
                            extras: extras
                        };
                        entries.push(entry);
                        console.log(`Added row entry: ${entradaDate} - ${salidaDate}`);
                    }
                });
            }
        }
    } else {
        // Fall back to regular pattern matching
        let allDates = [...text.matchAll(patterns.tableDate)];
        
        // Also try to match dates with month names
        const monthDates = [...text.matchAll(patterns.monthDate)];
        
        // Try additional date patterns
        const datesWithText = [...text.matchAll(patterns.dateWithText)];
        const datesInBrackets = [...text.matchAll(patterns.dateInBrackets)];
        
        // Convert month name dates to standard format and add to date arrays
        if (monthDates.length > 0) {
            monthDates.forEach(match => {
                const day = match[1];
                const monthName = match[2].toLowerCase();
                let month;
                
                // Handle both Spanish and English month names
                if (['enero', 'january'].includes(monthName)) month = '01';
                else if (['febrero', 'february'].includes(monthName)) month = '02';
                else if (['marzo', 'march'].includes(monthName)) month = '03';
                else if (['abril', 'april'].includes(monthName)) month = '04';
                else if (['mayo', 'may'].includes(monthName)) month = '05';
                else if (['junio', 'june'].includes(monthName)) month = '06';
                else if (['julio', 'july'].includes(monthName)) month = '07';
                else if (['agosto', 'august'].includes(monthName)) month = '08';
                else if (['septiembre', 'september'].includes(monthName)) month = '09';
                else if (['octubre', 'october'].includes(monthName)) month = '10';
                else if (['noviembre', 'november'].includes(monthName)) month = '11';
                else if (['diciembre', 'december'].includes(monthName)) month = '12';
                
                const year = match[3] ? match[3].length === 2 ? '20' + match[3] : match[3] : new Date().getFullYear().toString();
                const dateStr = `${day}/${month}/${year}`;
                allDates.push([null, dateStr]);
            });
        }
        
        // Add dates from text patterns
        if (datesWithText.length > 0) {
            datesWithText.forEach(match => {
                allDates.push([null, match[1]]);
            });
        }
        
        // Add dates from brackets
        if (datesInBrackets.length > 0) {
            datesInBrackets.forEach(match => {
                allDates.push([null, match[1]]);
            });
        }
        
        console.log('All dates found:', allDates.length);
        
        // Try to find check-in and check-out labels near dates
        const checkInMatch = text.match(patterns.checkIn);
        const checkOutMatch = text.match(patterns.checkOut);
        
        if (checkInMatch || checkOutMatch) {
            // If we have labeled dates, use them directly
            const entry = {
                vivienda: formattedPropertyName,
                fechaEntrada: checkInMatch ? formatDate(checkInMatch[1].trim()) : '',
                horaEntrada: '',
                fechaSalida: checkOutMatch ? formatDate(checkOutMatch[1].trim()) : '',
                horaSalida: '',
                horasLimpiadora: 2,
                extras: extras
            };
            
            if (entry.fechaEntrada || entry.fechaSalida) {
                entries.push(entry);
            }
        }
        
        // Process all dates as potential entries
        if (allDates && allDates.length > 0) {
            // Sort dates chronologically
            allDates.sort((a, b) => new Date(formatDate(a[1])) - new Date(formatDate(b[1])));
            
            // Create entries for each consecutive pair of dates
            for (let i = 0; i < allDates.length - 1; i++) {
                const currentDate = formatDate(allDates[i][1].trim());
                const nextDate = formatDate(allDates[i + 1][1].trim());
                
                // Check if dates are within a reasonable range (e.g., less than 30 days apart)
                const daysDiff = (new Date(nextDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24);
                if (daysDiff > 0 && daysDiff <= 30) {
                    const entry = {
                        vivienda: formattedPropertyName,
                        fechaEntrada: currentDate,
                        horaEntrada: '',
                        fechaSalida: nextDate,
                        horaSalida: '',
                        horasLimpiadora: 2,
                        extras: extras
                    };
                    
                    // Check if this entry already exists
                    const alreadyExists = entries.some(e => 
                        e.fechaEntrada === entry.fechaEntrada && 
                        e.fechaSalida === entry.fechaSalida);
                    
                    if (!alreadyExists) {
                        entries.push(entry);
                        console.log(`Added consecutive dates entry: ${currentDate} - ${nextDate}`);
                    }
                }
            }
        }
    }
    
    // Return success if we found any valid entries
    return {
        success: entries.length > 0,
        data: entries,
        message: entries.length === 0 ? 'No se pudieron extraer fechas del PDF.' : undefined
    };
}

// Parse extracted text to find property information
function parsePropertyText(text) {
    const patterns = {
        propertyName: /RELACIÓN\s+DE\s+RESERVAS\s+APARTAMENTO\s+([A-Z]-\d+)/i,
        checkIn: /(?:Entrada|Check[\s-]*in|Llegada|Arrival|Fecha[\s-]*de[\s-]*entrada)[:;]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
        checkOut: /(?:Salida|Check[\s-]*out|Partida|Departure|Fecha[\s-]*de[\s-]*salida)[:;]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
        extras: /(?:COMENTARIO|Observaciones|Notas|Notes|Comments)[:;]?\s*([^\n\r]+)/i,
        tableDate: /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g
    };

    // Create an array to store entries (for consistency with parsePropertyTextMultiple)
    const entries = [];
    
    // Extract property name (optional)
    const propertyNameMatch = text.match(patterns.propertyName);
    let propertyName = propertyNameMatch ? propertyNameMatch[1].trim() : 'Unknown';
    
    // Format property name
    let formattedPropertyName = propertyName;
    if (formattedPropertyName.includes('A-4') || text.toLowerCase().includes('a-4') || text.toLowerCase().includes('a4')) {
        formattedPropertyName = 'La perla A4';
    } else if (formattedPropertyName.includes('A-11') || text.toLowerCase().includes('a-11') || text.toLowerCase().includes('a11')) {
        formattedPropertyName = 'La perla A11';
    } else if (formattedPropertyName.includes('C-13') || text.toLowerCase().includes('c-13') || text.toLowerCase().includes('c13')) {
        formattedPropertyName = 'La perla C13';
    } else if (formattedPropertyName.includes('C-17') || text.toLowerCase().includes('c-17') || text.toLowerCase().includes('c17')) {
        formattedPropertyName = 'La perla C17';
    }
    
    // Extract extras
    const comentarioIndex = text.indexOf('COMENTARIO');
    const limpiezaIndex = text.indexOf('LIMPIEZA');
    let extrasText = '';
    
    if (comentarioIndex > 0) {
        const comentarioEndIndex = limpiezaIndex > 0 ? limpiezaIndex : text.length;
        const comentarioSection = text.substring(comentarioIndex, comentarioEndIndex);
        const extrasMatch = comentarioSection.match(/COMENTARIO[\s\n\r]+(.*?)(?=[\n\r]\s*[A-Z]{3,}|$)/s);
        if (extrasMatch && extrasMatch[1]) {
            extrasText = extrasMatch[1].trim();
        }
    } else {
        const extrasMatch = text.match(patterns.extras);
        if (extrasMatch) {
            extrasText = extrasMatch[1].trim();
        }
    }
    
    const extras = extrasText ? extrasText.split(/[,;]/).map(e => e.trim()) : [];
    
    // Extract dates from labeled sections or any date pattern
    const allDates = [...text.matchAll(patterns.tableDate)];
    if (allDates && allDates.length >= 2) {
        // Create an entry with the extracted data
        const entry = {
            vivienda: formattedPropertyName,
            fechaEntrada: formatDate(allDates[0][1].trim()),
            horaEntrada: '',
            fechaSalida: formatDate(allDates[1][1].trim()),
            horaSalida: '',
            horasLimpiadora: 2,
            extras: extras
        };
        entries.push(entry);
    } else {
        // Try to find specifically labeled dates
        const checkInMatch = text.match(patterns.checkIn);
        const checkOutMatch = text.match(patterns.checkOut);
        
        // Create an entry with the extracted data
        const entry = {
            vivienda: formattedPropertyName,
            fechaEntrada: checkInMatch ? formatDate(checkInMatch[1].trim()) : '',
            horaEntrada: '',
            fechaSalida: checkOutMatch ? formatDate(checkOutMatch[1].trim()) : '',
            horaSalida: '',
            horasLimpiadora: 2,
            extras: extras
        };
        
        // Only add the entry if we have at least one date
        if (entry.fechaEntrada || entry.fechaSalida) {
            entries.push(entry);
        }
    }
    
    // Return success if we have at least one entry with dates
    return {
        success: entries.length > 0,
        data: entries,
        message: entries.length === 0 ? 'No se pudieron extraer fechas del PDF.' : undefined
    };
}

// Register property data in the system
function registerProperty(data) {
    try {
        console.log('Starting registerProperty with data:', data);
        
        // Check if data is an array (multiple entries) or a single entry
        const dataArray = Array.isArray(data) ? data : [data];
        console.log(`Processing ${dataArray.length} entries`);
        
        // Get existing registros from localStorage
        let registros = JSON.parse(localStorage.getItem('registrosViviendas')) || [];
        console.log(`Current registros count: ${registros.length}`);
        
        // Add new property data
        const initialCount = registros.length;
        registros = registros.concat(dataArray);
        console.log(`New registros count: ${registros.length} (added ${registros.length - initialCount})`);
        
        // Save updated registros
        localStorage.setItem('registrosViviendas', JSON.stringify(registros));
        
        // Verify the data was saved correctly
        const savedRegistros = JSON.parse(localStorage.getItem('registrosViviendas')) || [];
        console.log(`Verified saved registros count: ${savedRegistros.length}`);
        
        // Make sure the global registros variable is updated
        if (typeof window.registros !== 'undefined') {
            window.registros = savedRegistros;
            console.log('Updated global registros variable');
        }
        
        // Update UI - first try actualizarUI function
        if (typeof actualizarUI === 'function') {
            console.log('Calling actualizarUI function');
            actualizarUI();
        } 
        // Then try mostrarHistorialRegistros as a fallback
        else if (typeof mostrarHistorialRegistros === 'function') {
            console.log('Calling mostrarHistorialRegistros function');
            mostrarHistorialRegistros();
        }
        
        return dataArray.length; // Return number of entries added
    } catch (error) {
        console.error('Error in registerProperty:', error);
        throw error; // Re-throw to be caught by the caller
    }
}