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
                    message: 'No se encontraron fechas válidas en el PDF. Por favor, asegúrese de que el PDF contiene fechas en formato DD/MM/YYYY o DD-MM-YYYY.'
                };
            }
        } else {
            console.warn('No valid entries found in PDF');
            return { 
                success: false, 
                message: 'No se pudieron extraer fechas del PDF. Por favor, verifica que el PDF contenga fechas de entrada o salida en formato DD/MM/YYYY o DD-MM-YYYY.'
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
            return !savedRegistros.some(existingEntry => 
                existingEntry.vivienda === newEntry.vivienda &&
                existingEntry.fechaEntrada === formatDate(newEntry.fechaEntrada) &&
                existingEntry.fechaSalida === formatDate(newEntry.fechaSalida)
            );
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
            
            // Add default values if not present
            data.horaEntrada = data.horaEntrada || '';
            data.horaSalida = data.horaSalida || '';
            data.horasLimpiadora = data.horasLimpiadora || 2;
            data.extras = data.extras || [];
            
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

// Function to extract property data from PDF
async function extractPropertyData(pdf) {
    try {
        let allText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + '\n';
        }
        
        console.log('Extracted text from PDF:', allText.substring(0, 200) + '...');
        
        // Try to parse the text to find property information
        return parsePropertyTextMultiple(allText);
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
                
                entries.push({
                    vivienda: propertyName,
                    fechaEntrada: dates[i],
                    fechaSalida: dates[i + 1] || ''
                });
            }
            // Handle odd number of dates
            if (dates.length % 2 !== 0) {
                const propertyName = properties.length > 0 ? properties[Math.floor((dates.length-1)/2) % properties.length] : 'Vivienda';
                entries.push({
                    vivienda: propertyName,
                    fechaEntrada: dates[dates.length - 1],
                    fechaSalida: ''
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