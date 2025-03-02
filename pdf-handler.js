// PDF Handler for Vacation Rental Management System

// Initialize PDF.js library with error handling
let pdfjsLib;
try {
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLib.GlobalWorkerOptions.disableAutoFetch = true;
        pdfjsLib.GlobalWorkerOptions.disableStream = true;
        pdfjsLib.GlobalWorkerOptions.verbosity = pdfjsLib.VerbosityLevel.ERRORS;
        console.log('PDF.js library initialized in pdf-handler.js');
    } else {
        console.error('PDF.js library not available in global scope');
    }
} catch (error) {
    console.error('Error initializing PDF.js library:', error);
}

// Function to ensure PDF.js is loaded
async function ensurePDFJSLoaded() {
    return new Promise((resolve, reject) => {
        // If PDF.js is already loaded and initialized
        if (window.pdfjsLib) {
            console.log('PDF.js is already loaded and initialized');
            resolve();
            return;
        }

        // If window['pdfjs-dist/build/pdf'] exists but pdfjsLib isn't set
        if (window['pdfjs-dist/build/pdf']) {
            try {
                window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                console.log('PDF.js initialized from existing library');
                resolve();
                return;
            } catch (error) {
                console.error('Error initializing existing PDF.js:', error);
            }
        }

        reject(new Error('PDF.js library not available. Please ensure the library is loaded properly.'));
    });
}

// Function to load PDF.js and its worker with improved error handling
window.loadPDFJS = function() {
    return new Promise((resolve, reject) => {
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
            console.log('PDF.js is already loaded');
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.crossOrigin = 'anonymous';
        script.async = true;

        let workerScriptLoaded = false;
        let mainScriptLoaded = false;

        // Load worker script in parallel
        const workerScript = document.createElement('script');
        workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        workerScript.crossOrigin = 'anonymous';
        workerScript.async = true;

        workerScript.onload = () => {
            console.log('PDF.js worker script loaded');
            workerScriptLoaded = true;
            if (mainScriptLoaded) {
                initializePDFJS();
            }
        };

        workerScript.onerror = () => {
            reject(new Error('Failed to load PDF.js worker script'));
        };

        script.onload = () => {
            console.log('PDF.js main script loaded');
            mainScriptLoaded = true;
            if (workerScriptLoaded) {
                initializePDFJS();
            }
        };

        script.onerror = () => {
            reject(new Error('Failed to load PDF.js main script'));
        };

        function initializePDFJS() {
            try {
                if (typeof window['pdfjs-dist/build/pdf'] === 'undefined') {
                    throw new Error('PDF.js library not found in global scope');
                }
                window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerScript.src;
                window.pdfjsLib.GlobalWorkerOptions.disableAutoFetch = true;
                window.pdfjsLib.GlobalWorkerOptions.disableStream = true;
                window.pdfjsLib.GlobalWorkerOptions.verbosity = window.pdfjsLib.VerbosityLevel.ERRORS;
                console.log('PDF.js initialized with worker');
                resolve();
            } catch (error) {
                console.error('PDF.js initialization error:', error);
                reject(error);
            }
        }

        document.head.appendChild(script);
        document.head.appendChild(workerScript);
    });
};

// Helper function to format dates consistently
function formatDate(dateStr) {
    // Handle different date formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
    const parts = dateStr.split(/[/.-]/);
    
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
        
        // Check if running on GitHub Pages
        const isGitHubPages = window.location.hostname.includes('github.io');
        if (isGitHubPages) {
            console.warn('Running on GitHub Pages - some features may be limited');
        }
        
        // Validate file is a PDF
        if (file.type !== 'application/pdf') {
            return {
                success: false,
                message: 'El archivo seleccionado no es un PDF válido. Por favor, seleccione un archivo PDF.'
            };
        }
        
        // Ensure PDF.js is loaded before proceeding
        try {
            await ensurePDFJSLoaded();
        } catch (loadError) {
            console.error('PDF.js loading error:', loadError);
            throw new Error('La biblioteca PDF.js no se cargó correctamente. Por favor, actualice la página e intente de nuevo.');
        }
        
        // Load and process the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
        
        // Extract all text from PDF first
        let allText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + '\n';
        }

        // Extract all numbers with context
        const allNumbers = extractAllNumbers(allText);
        console.log('All numbers found in PDF:', allNumbers);

        const result = await extractPropertyData(pdf);
        console.log('PDF data extraction result:', result);

        // Add raw numbers data to the result
        result.rawNumbers = allNumbers;
        
        // Store dates and property name for raw mode processing
        if (result && result.data) {
            // Extract dates from the result
            const dates = [];
            if (Array.isArray(result.data)) {
                result.data.forEach(entry => {
                    if (entry.fechaEntrada) dates.push(entry.fechaEntrada);
                    if (entry.fechaSalida) dates.push(entry.fechaSalida);
                });
            }
            window.lastPdfDates = dates;
            
            // Extract property name
            if (Array.isArray(result.data) && result.data.length > 0 && result.data[0].vivienda) {
                window.lastPropertyName = result.data[0].vivienda;
            }
        }
        
        // If we have raw numbers but no success in normal extraction, still return success
        // so the user can see the raw numbers and select which ones to use
        if (!result.success && allNumbers.length > 0) {
            return {
                success: true,
                message: `Se han encontrado ${allNumbers.length} números en el PDF. Seleccione cuáles corresponden a adultos.`,
                rawNumbers: allNumbers,
                rawMode: true
            };
        }
        
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
                    const newEntriesCount = registerProperty(validEntries);
                    console.log(`${newEntriesCount} new entries registered successfully`);
                    
                    // If no new entries were added (all were duplicates)
                    if (newEntriesCount === 0) {
                        return {
                            success: true,
                            message: 'No se han añadido nuevas entradas. Todas las entradas ya existían en el sistema.'
                        };
                    }
                    
                    const message = `Se han registrado ${newEntriesCount} entradas correctamente${invalidEntries > 0 ? ` (${invalidEntries} entradas no válidas)` : ''}.`;
                    return { 
                        success: true,
                        message: message
                    };
                } catch (error) {
                    console.error('Error registering entries:', error);
                    return {
                        success: false,
                        message: 'Error al registrar las entradas: ' + error.message
                    };
                }
            } else {
                return {
                    success: false,
                    message: 'No se encontraron fechas válidas en el PDF. Por favor, asegúrese de que el PDF contiene fechas en formato DD/MM/YYYY o DD-MM/YYYY.'
                };
            }
        } else {
            console.warn('No valid entries found in PDF');
            return { 
                success: false, 
                message: 'No se pudieron extraer fechas del PDF. Por favor, verifica que el PDF contenga fechas de entrada o salida en formato DD/MM/YYYY o DD-MM/YYYY.'
            };
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        
        // Provide more specific error messages
        if (error.name === 'MissingPDFException') {
            return {
                success: false,
                message: 'El archivo no es un PDF válido o está dañado.'
            };
        } else if (error.name === 'InvalidPDFException') {
            return {
                success: false,
                message: 'El archivo PDF no es válido o está protegido.'
            };
        } else if (error.name === 'PasswordException') {
            return {
                success: false,
                message: 'El archivo PDF está protegido con contraseña.'
            };
        } else if (window.location.hostname.includes('github.io')) {
            return { 
                success: false, 
                message: 'Error al procesar el PDF en GitHub Pages. Esta funcionalidad puede tener limitaciones en este entorno. Para una experiencia completa, utilice la aplicación localmente.'
            };
        }
        
        return { 
            success: false, 
            message: 'Error al procesar el PDF: ' + error.message 
        };
    }
};

// Function to register property data in the system
function registerProperty(dataArray) {
    try {
        if (!Array.isArray(dataArray)) {
            dataArray = [dataArray]; // Convert single object to array
        }
        
        // Get existing registros from localStorage
        let savedRegistros = [];
        const savedRegistrosStr = localStorage.getItem('registrosViviendas');
        if (savedRegistrosStr) {
            try {
                savedRegistros = JSON.parse(savedRegistrosStr);
            } catch (error) {
                console.error('Error parsing saved registros:', error);
                savedRegistros = [];
            }
        }
        
        // Filter out duplicates before adding new entries
        const newEntries = dataArray.filter(newEntry => {
            return !savedRegistros.some(existingEntry => {
                // Check if it's the same property
                if (existingEntry.vivienda === newEntry.vivienda) {
                    // Convert dates to comparable format
                    const newEntryStart = new Date(formatDate(newEntry.fechaEntrada));
                    const newEntryEnd = new Date(formatDate(newEntry.fechaSalida));
                    const existingEntryStart = new Date(existingEntry.fechaEntrada);
                    const existingEntryEnd = new Date(existingEntry.fechaSalida);
                    
                    // Check for date overlap
                    return (newEntryStart <= existingEntryEnd && newEntryEnd >= existingEntryStart);
                }
                return false;
            });
        });

        // Add new entries
        newEntries.forEach(data => {
            // Format dates if they exist
            if (data.fechaEntrada) {
                data.fechaEntrada = formatDate(data.fechaEntrada);
            }
            if (data.fechaSalida) {
                data.fechaSalida = formatDate(data.fechaSalida);
            }
            
            // Set default values, but don't set default cleaning hours
            data.horaEntrada = '';
            data.horaSalida = '';
            data.horasLimpiadora = 0; // Set to 0 instead of default 2
            data.extras = [];
            
            savedRegistros.push(data);
        });
        
        // Save back to localStorage
        localStorage.setItem('registrosViviendas', JSON.stringify(savedRegistros));
        
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
        
        return newEntries.length; // Return number of new entries added
    } catch (error) {
        console.error('Error in registerProperty:', error);
        throw error; // Re-throw to be caught by the caller
    }
}

// Function to extract all numbers with their positions from PDF text
function extractAllNumbers(text) {
    const numbers = [];
    const numberRegex = /\b\d+\b/g;
    let match;
    let index = 0;
    
    while ((match = numberRegex.exec(text)) !== null) {
        numbers.push({
            index: index++,
            value: parseInt(match[0]),
            position: match.index,
            context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
        });
    }
    
    return numbers;
}

// Function to extract property data from PDF
async function extractPropertyData(pdf) {
    try {
        let allText = '';
        let propertyName = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + '\n';
            
            // Try to find property name in the header
            const headerMatch = pageText.match(/RELACIÓN DE RESERVAS APARTAMENTO ([A-Z]-?\d+|[A-Z]\d+|[A-Z]-[A-Z]\d+|[A-Z0-9-]+)/i);
            if (headerMatch && !propertyName) {
                // Format the property name correctly based on the identifier
                const identifier = headerMatch[1];
                // Check if it's already a complete name
                if (identifier.toLowerCase().startsWith('estrella') || 
                    identifier.toLowerCase().startsWith('mar azul') || 
                    identifier.toLowerCase().startsWith('lago')) {
                    propertyName = identifier;
                } else {
                    // It's a La Perla apartment
                    propertyName = `La perla ${identifier}`;
                }
            }
        }
        
        console.log('Extracted text from PDF:', allText.substring(0, 200) + '...');
        console.log('Found property name:', propertyName);
        
        // Try to parse the text to find property information
        const result = parsePropertyTextMultiple(allText);
        
        // Add the property name to each entry if found
        if (propertyName && result.success && Array.isArray(result.data)) {
            result.data.forEach(entry => {
                entry.vivienda = propertyName;
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error extracting property data:', error);
        throw error;
    }
}

// Parse extracted text to find multiple property entries
function parsePropertyTextMultiple(text) {
    try {
        // Regular expressions for finding dates and property names with improved patterns
        const dateRegex = /\b(\d{1,2}[\/.-]\d{1,2}[\/.-](?:20)?\d{2})\b/g;
        const propertyRegex = /\b(Estrella del mar|La perla A4|La perla A11|La perla C13|La perla C17|Mar azul|Lago de Mirazul)\b/gi;
        
        // Clean and normalize text
        text = text.replace(/\s+/g, ' ').trim();
        
        // Find all dates in the text
        const dates = [];
        let match;
        while ((match = dateRegex.exec(text)) !== null) {
            // Validate date format
            const dateParts = match[1].split(/[\/.-]/);
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2]);
                
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2024) {
                    dates.push(match[1]);
                }
            }
        }

        // Find number of adults using the improved pattern matching
        const adultNumbers = [];
        const childNumbers = []; // Array to store child counts
        const childAges = []; // Array to store child ages
        // Look for numbers that appear after date patterns in a specific sequence
        const dateNumberPattern = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+\d+\s+(\d+)(?:\s+(\d+)(?:\s+([\d\s,y]+))?)?\b/g;
        let dateNumberMatch;
        
        while ((dateNumberMatch = dateNumberPattern.exec(text)) !== null) {
            const adultNumber = parseInt(dateNumberMatch[1]);
            // Validate the number is reasonable for adults (typically 1-8)
            if (adultNumber > 0 && adultNumber <= 8) {
                adultNumbers.push(adultNumber);
                // Check if there's a child number after the adult number
                const childNumber = dateNumberMatch[2] ? parseInt(dateNumberMatch[2]) : 0;
                childNumbers.push(childNumber);
                
                // Extract and process child ages if present
                let ageString = dateNumberMatch[3] || '';
                // Process age string to handle patterns like "5 y 13" or "5, 13"
                if (ageString) {
                    // First, normalize the string by replacing 'y' with commas
                    ageString = ageString.replace(/\s+y\s+/g, ',');
                    // Then extract all numbers
                    const ageMatches = ageString.match(/\d+/g) || [];
                    ageString = ageMatches.join(', ');
                }
                childAges.push(ageString);
            }
        }
        
        // If no matches found with date pattern, try looking for numbers after nights
        if (adultNumbers.length === 0) {
            const nightsAdultPattern = /\b\d+\s+(\d)(?:\s+(\d+)(?:\s+([\d,y]+))?)?\s+(?:Pendiente|Entre|\+|[A-Z])/g;
            let nightsAdultMatch;
            while ((nightsAdultMatch = nightsAdultPattern.exec(text)) !== null) {
                const adultNumber = parseInt(nightsAdultMatch[1]);
                if (adultNumber > 0 && adultNumber <= 8) {
                    adultNumbers.push(adultNumber);
                    // Check if there's a child number after the adult number
                    const childNumber = nightsAdultMatch[2] ? parseInt(nightsAdultMatch[2]) : 0;
                    childNumbers.push(childNumber);
                    // Extract child ages if present
                    const ageString = nightsAdultMatch[3] || '';
                    childAges.push(ageString);
                }
            }
        }
        
        // If still no matches, try the original ADULTOS section method
        if (adultNumbers.length === 0) {
            const adultRegex = /ADULTOS[\s\S]*?(?=NIÑOS|$)/i;
            const adultSection = text.match(adultRegex);
            if (adultSection) {
                const numberRegex = /\b\d+\b/g;
                let adultMatch;
                while ((adultMatch = numberRegex.exec(adultSection[0])) !== null) {
                    const adultNumber = parseInt(adultMatch[0]);
                    if (adultNumber > 0 && adultNumber <= 8) {
                        adultNumbers.push(adultNumber);
                        childNumbers.push(0); // Default to 0 children for this method
                    }
                }
            }
            
            // Try to find NIÑOS section separately
            const childRegex = /NIÑOS[\s\S]*?(?=ADULTOS|$)/i;
            const childSection = text.match(childRegex);
            if (childSection && adultNumbers.length > 0) {
                const numberRegex = /\b\d+\b/g;
                let childMatch;
                let childIndex = 0;
                while ((childMatch = numberRegex.exec(childSection[0])) !== null && childIndex < adultNumbers.length) {
                    const childNumber = parseInt(childMatch[0]);
                    if (childNumber >= 0 && childNumber <= 8) {
                        childNumbers[childIndex] = childNumber;
                        childIndex++;
                    }
                }
            }
        }
        
        // Find all property names
        const properties = [];
        while ((match = propertyRegex.exec(text)) !== null) {
            properties.push(match[1]);
        }
        
        // If we found dates
        if (dates.length > 0) {
            const entries = [];
            // Process dates in pairs
            for (let i = 0; i < dates.length - 1; i += 2) {
                // Try to find a property name near these dates
                const propertyName = properties.length > 0 ? properties[Math.floor(i/2) % properties.length] : 'Vivienda';
                const entryIndex = Math.floor(i/2);
                
                entries.push({
                    vivienda: propertyName,
                    fechaEntrada: dates[i],
                    fechaSalida: dates[i + 1] || '',
                    adultos: adultNumbers[entryIndex] || 0, // Use the extracted adult numbers
                    ninos: childNumbers[entryIndex] || 0, // Add the child count
                    edadesNinos: childAges[entryIndex] || '', // Add the child ages
                    numHuespedes: (adultNumbers[entryIndex] || 0) + (childNumbers[entryIndex] || 0) // Total guests
                });
            }
            // Handle odd number of dates
            if (dates.length % 2 !== 0) {
                const propertyName = properties.length > 0 ? properties[Math.floor((dates.length-1)/2) % properties.length] : 'Vivienda';
                const entryIndex = Math.floor((dates.length-1)/2);
                
                entries.push({
                    vivienda: propertyName,
                    fechaEntrada: dates[dates.length - 1],
                    fechaSalida: '',
                    adultos: adultNumbers[entryIndex] || 0, // Use the extracted adult numbers
                    ninos: childNumbers[entryIndex] || 0, // Add the child count
                    edadesNinos: childAges[entryIndex] || '', // Add the child ages
                    numHuespedes: (adultNumbers[entryIndex] || 0) + (childNumbers[entryIndex] || 0) // Total guests
                });
            }
            
            return {
                success: true,
                data: entries
            };
        } else {
            return {
                success: false,
                message: 'No se encontraron fechas en el PDF'
            };
        }
    } catch (error) {
        console.error('Error parsing PDF text:', error);
        return {
            success: false,
            message: 'Error al analizar el texto del PDF: ' + error.message
        };
    }
}