document.addEventListener('DOMContentLoaded', function () {
    // Configurar el manejador de archivos PDF
    const pdfFileInput = document.getElementById('pdfFileInput');
    const uploadStatus = document.getElementById('uploadStatus');
    
    if (pdfFileInput) {
        const acceptPdfButton = document.getElementById('acceptPdfButton');
        
        pdfFileInput.addEventListener('change', async function(event) {
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                uploadStatus.textContent = 'Procesando PDF...';
                uploadStatus.style.color = '#666';
                acceptPdfButton.style.display = 'none';
                
                try {
                    // Ensure we're accessing the function from the window object
                    const result = await window.handlePDFUpload(file);
                    if (result.success) {
                        uploadStatus.textContent = '¡PDF procesado con éxito! Haga clic en Aceptar para registrar la vivienda.';
                        uploadStatus.style.color = '#28a745';
                        acceptPdfButton.style.display = 'inline-block';
                    } else {
                        let errorMessage = result.message;
                        if (result.missingFields) {
                            const fieldNames = {
                                propertyName: 'Nombre de la vivienda',
                                checkIn: 'Fecha de entrada',
                                checkOut: 'Fecha de salida'
                            };
                            const missingFieldsText = result.missingFields
                                .map(field => fieldNames[field])
                                .join(', ');
                            errorMessage += `\nCampos faltantes: ${missingFieldsText}`;
                        }
                        uploadStatus.innerHTML = errorMessage.replace('\n', '<br>');
                        uploadStatus.style.color = '#dc3545';
                    }
                } catch (error) {
                    console.error('Error al procesar el PDF:', error);
                    uploadStatus.textContent = 'Error al procesar el PDF: ' + error.message;
                    uploadStatus.style.color = '#dc3545';
                }
                
                // Limpiar el input para permitir subir el mismo archivo nuevamente
                event.target.value = '';
            }
        });

        // Add click handler for accept button
        acceptPdfButton.addEventListener('click', function() {
            // Update UI
            actualizarUI();
            // Hide the accept button
            acceptPdfButton.style.display = 'none';
            // Clear the status
            uploadStatus.textContent = '';
        });
    }

    // Todas las funciones están definidas en este archivo
    const registroForm = document.getElementById('registroForm');
    const historialRegistros = document.getElementById('historialRegistros');
    const btnDescargarCSV = document.getElementById('btnDescargarCSV');
    const viviendasHoy = document.getElementById('viviendasHoy');
    const viviendasManana = document.getElementById('viviendasManana');
    const viviendasPasadoManana = document.getElementById('viviendasPasadoManana');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.getElementById('theme-toggle');
    let registros = JSON.parse(localStorage.getItem('registrosViviendas')) || [];
    
    // Inicializar el tema según la preferencia guardada
    initTheme();
    
    // Registrar el Service Worker para notificaciones
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        registerServiceWorker();
    }
    
    // Función para manejar el menú móvil
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
    
    // Cerrar el menú al hacer clic en un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Función para inicializar el tema
    function initTheme() {
        // Verificar si hay un tema guardado en localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Configurar el botón de cambio de tema
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Función para cambiar entre temas claro y oscuro
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    // Función para registrar el Service Worker
    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registrado con éxito:', registration);
            
            // Solicitar permiso para notificaciones
            requestNotificationPermission();
            
        } catch (error) {
            console.error('Error al registrar el Service Worker:', error);
        }
    }
    
    // Función para solicitar permiso de notificaciones
    async function requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Permiso de notificación concedido');
                // Verificar si hay propiedades para hoy y enviar notificación
                checkAndNotifyTodayProperties();
            } else {
                console.log('Permiso de notificación denegado');
            }
        } catch (error) {
            console.error('Error al solicitar permiso de notificación:', error);
        }
    }
    
    // Función para verificar y notificar sobre propiedades de hoy
    function checkAndNotifyTodayProperties() {
        const hoy = new Date();
        let propiedadesHoy = [];
        
        registros.forEach(registro => {
            const entradaDate = new Date(registro.fechaEntrada);
            const salidaDate = new Date(registro.fechaSalida);
            
            if (entradaDate.toDateString() === hoy.toDateString()) {
                propiedadesHoy.push({
                    tipo: 'entrada',
                    vivienda: registro.vivienda,
                    hora: registro.horaEntrada || 'No especificada'
                });
            }
            
            if (salidaDate.toDateString() === hoy.toDateString()) {
                propiedadesHoy.push({
                    tipo: 'salida',
                    vivienda: registro.vivienda,
                    hora: registro.horaSalida || 'No especificada'
                });
            }
        });
        
        if (propiedadesHoy.length > 0) {
            sendNotification(propiedadesHoy);
        }
    }
    
    // Función para enviar notificaciones
    function sendNotification(propiedades) {
        if (Notification.permission === 'granted') {
            // Crear mensaje para la notificación
            let title = `${propiedades.length} propiedad(es) para hoy`;
            let body = propiedades.map(p => 
                `${p.vivienda} (${p.tipo} a las ${p.hora})`
            ).join('\n');
            
            // Verificar si el Service Worker está activo
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: '/icon.png',  // Puedes añadir un icono personalizado
                        badge: '/badge.png', // Puedes añadir un badge personalizado
                        vibrate: [100, 50, 100],
                        tag: 'vivienda-notification',
                        data: { propiedades: propiedades },
                        actions: [
                            { action: 'view', title: 'Ver propiedades' }
                        ]
                    });
                });
            } else {
                // Fallback para navegadores que no soportan Service Workers
                new Notification(title, { body: body });
            }
        }
    }

    function mostrarViviendas() {
        const hoy = new Date();
        const manana = new Date(hoy.getTime() + (24 * 60 * 60 * 1000));
        const pasadoManana = new Date(hoy.getTime() + (48 * 60 * 60 * 1000));

        viviendasHoy.innerHTML = '';
        viviendasManana.innerHTML = '';
        viviendasPasadoManana.innerHTML = '';

        registros.forEach(registro => {
            const entradaDate = new Date(registro.fechaEntrada);
            const salidaDate = new Date(registro.fechaSalida);

            // Crear botones en lugar de divs para cada propiedad
            if (entradaDate.toDateString() === hoy.toDateString()) {
                const botonEntrada = document.createElement('button');
                botonEntrada.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonEntrada.classList.add('propiedad-completada');
                }
                botonEntrada.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Entrada: ${registro.fechaEntrada} ${registro.horaEntrada}</span>`;
                botonEntrada.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasHoy.appendChild(botonEntrada);
            } else if (salidaDate.toDateString() === hoy.toDateString()) {
                const botonSalida = document.createElement('button');
                botonSalida.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonSalida.classList.add('propiedad-completada');
                }
                botonSalida.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Salida: ${registro.fechaSalida} ${registro.horaSalida}</span>`;
                botonSalida.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasHoy.appendChild(botonSalida);
            }

            if (entradaDate.toDateString() === manana.toDateString()) {
                const botonEntrada = document.createElement('button');
                botonEntrada.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonEntrada.classList.add('propiedad-completada');
                }
                botonEntrada.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Entrada: ${registro.fechaEntrada} ${registro.horaEntrada}</span>`;
                botonEntrada.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasManana.appendChild(botonEntrada);
            } else if (salidaDate.toDateString() === manana.toDateString()) {
                const botonSalida = document.createElement('button');
                botonSalida.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonSalida.classList.add('propiedad-completada');
                }
                botonSalida.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Salida: ${registro.fechaSalida} ${registro.horaSalida}</span>`;
                botonSalida.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasManana.appendChild(botonSalida);
            }

            if (entradaDate.toDateString() === pasadoManana.toDateString()) {
                const botonEntrada = document.createElement('button');
                botonEntrada.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonEntrada.classList.add('propiedad-completada');
                }
                botonEntrada.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Entrada: ${registro.fechaEntrada} ${registro.horaEntrada}</span>`;
                botonEntrada.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasPasadoManana.appendChild(botonEntrada);
            } else if (salidaDate.toDateString() === pasadoManana.toDateString()) {
                const botonSalida = document.createElement('button');
                botonSalida.classList.add('propiedad-btn');
                // Añadir clase si está completado
                if (registro.completado) {
                    botonSalida.classList.add('propiedad-completada');
                }
                botonSalida.innerHTML = `<span class="vivienda-nombre">${registro.vivienda}</span><span class="vivienda-detalle">Salida: ${registro.fechaSalida} ${registro.horaSalida}</span>`;
                botonSalida.addEventListener('click', () => mostrarDetallesPropiedad(registro));
                viviendasPasadoManana.appendChild(botonSalida);
            }
        });
    }

    function actualizarUI() {
        mostrarViviendas();
        mostrarHistorialRegistros();
    }

    // Mantener un registro de las fechas expandidas
    let fechasExpandidas = new Set();
    
    function mostrarHistorialRegistros() {
        // Guardar el estado de expansión actual antes de limpiar el contenido
        document.querySelectorAll('#historialRegistros .grupo').forEach(grupo => {
            const titulo = grupo.querySelector('.fecha-titulo');
            const contenido = grupo.querySelector('.contenido');
            const fecha = titulo.textContent.replace(' ▼', '').replace(' ▲', '').replace(/\s*\(\d+\s*apartamentos?\)\s*/, '');
            
            if (contenido.style.display === 'block') {
                fechasExpandidas.add(fecha);
            } else {
                fechasExpandidas.delete(fecha);
            }
        });
        
        historialRegistros.innerHTML = '';
        const registrosAgrupados = agruparRegistrosPorFecha(registros);

        // Ordenar los grupos por fecha de manera ascendente
        const gruposOrdenados = Array.from(registrosAgrupados.entries()).sort((a, b) => {
            const fechaA = new Date(a[0]);
            const fechaB = new Date(b[0]);
            return fechaA - fechaB;
        });

        gruposOrdenados.forEach(([fecha, registrosPorFecha]) => {
            const grupo = document.createElement('div');
            grupo.classList.add('grupo');

            const titulo = document.createElement('h3');
            titulo.classList.add('fecha-titulo');
            titulo.style.cursor = 'pointer';
            
            // Crear el texto de la fecha
            const fechaTexto = document.createTextNode(fecha);
            titulo.appendChild(fechaTexto);
            
            // Añadir el contador de apartamentos como una anotación
            const contadorApartamentos = document.createElement('span');
            contadorApartamentos.classList.add('contador-apartamentos');
            contadorApartamentos.style.fontSize = '0.7em'; // Mitad del tamaño de la fecha
            contadorApartamentos.style.color = '#666'; // Color más suave
            contadorApartamentos.style.fontWeight = 'normal';
            contadorApartamentos.style.marginLeft = '10px';
            const numApartamentos = registrosPorFecha.length;
            contadorApartamentos.textContent = `(${numApartamentos} ${numApartamentos === 1 ? 'apartamento' : 'apartamentos'})`;
            titulo.appendChild(contadorApartamentos);
            
            // Añadir indicador visual de expansión
            const indicador = document.createElement('span');
            indicador.classList.add('indicador-expansion');
            titulo.appendChild(indicador);

            const contenido = document.createElement('div');
            contenido.classList.add('contenido');
            
            // Verificar si esta fecha estaba expandida anteriormente
            const estaExpandida = fechasExpandidas.has(fecha);
            if (estaExpandida) {
                contenido.style.display = 'block';
                indicador.textContent = ' ▲';
            } else {
                contenido.style.display = 'none';
                indicador.textContent = ' ▼';
            }

            registrosPorFecha.forEach(registro => {
                const entrada = document.createElement('div');
                entrada.classList.add('registro');
                // Añadir propiedad 'completado' si no existe
                if (registro.completado === undefined) {
                    registro.completado = false;
                }
                
                // Preparar información de trabajadoras si existe
                let trabajadorasHTML = '';
                if (registro.trabajadoras && registro.trabajadoras.length > 0) {
                    trabajadorasHTML = '<div class="trabajadoras-historial"><h4>Trabajadoras:</h4><ul>';
                    trabajadorasHTML += registro.trabajadoras.map(t => `<li><strong>${t.nombre}:</strong> ${t.horas} horas</li>`).join('');
                    trabajadorasHTML += '</ul></div>';
                }
                
                entrada.innerHTML = `
                    <p><strong>Vivienda:</strong> ${registro.vivienda}</p>
                    <p><strong>Entrada:</strong> ${registro.fechaEntrada ? `${registro.fechaEntrada} a las ${registro.horaEntrada || ''}` : 'N/A'}</p>
                    <p><strong>Salida:</strong> ${registro.fechaSalida ? `${registro.fechaSalida} a las ${registro.horaSalida || ''}` : 'N/A'}</p>
                    <p><strong>Horas de Limpieza Total:</strong> ${registro.horasLimpiadora}</p>
                    ${trabajadorasHTML}
                    <p><strong>Extras:</strong> ${registro.extras.join(", ")}</p>
                    ${registro.anotaciones ? `<p><strong>Anotaciones:</strong> ${registro.anotaciones}</p>` : ''}
                    <button class="borrarBtn">Borrar</button>
                    <button class="editarEntradaBtn">Editar Entrada</button>
                    <button class="editarSalidaBtn">Editar Salida</button>
                    <button class="editarTrabajadorasBtn">Editar Horas Trabajadoras</button>
                    <button class="editarExtrasBtn">Editar Extras</button>
                    <button class="anotacionesBtn">Anotaciones</button>
                    <button class="volverBtn">Volver al Piso</button>
                    <button class="completadoBtn ${registro.completado ? 'completado' : ''}">Hecho</button>
                `;
                
                // Si está completado, añadir clase a todo el registro
                if (registro.completado) {
                    entrada.classList.add('registro-completado');
                }
                contenido.appendChild(entrada);

                const borrarBtn = entrada.querySelector('.borrarBtn');
                borrarBtn.addEventListener('click', function () {
                    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
                        borrarRegistro(registro);
                        entrada.remove();
                    }
                });

                const editarEntradaBtn = entrada.querySelector('.editarEntradaBtn');
                editarEntradaBtn.addEventListener('click', function () {
                    editarEntrada(registro, entrada);
                });
                
                const editarSalidaBtn = entrada.querySelector('.editarSalidaBtn');
                editarSalidaBtn.addEventListener('click', function () {
                    editarSalida(registro, entrada);
                });

                const editarExtrasBtn = entrada.querySelector('.editarExtrasBtn');
                editarExtrasBtn.addEventListener('click', function () {
                    editarExtras(registro, entrada);
                });
                
                const editarTrabajadorasBtn = entrada.querySelector('.editarTrabajadorasBtn');
                editarTrabajadorasBtn.addEventListener('click', function () {
                    editarHorasTrabajadoras(registro, entrada);
                });
                
                const anotacionesBtn = entrada.querySelector('.anotacionesBtn');
                anotacionesBtn.addEventListener('click', function () {
                    editarAnotaciones(registro, entrada);
                });
                
                const completadoBtn = entrada.querySelector('.completadoBtn');
                completadoBtn.addEventListener('click', function () {
                    registro.completado = !registro.completado;
                    completadoBtn.classList.toggle('completado');
                    entrada.classList.toggle('registro-completado');
                    actualizarRegistro(registro);
                    actualizarBotonesPropiedad(registro);
                });
                
                // Añadir evento al botón de volver al piso
                const volverBtn = entrada.querySelector('.volverBtn');
                volverBtn.addEventListener('click', function() {
                    // Usar la misma función que se usa al hacer clic en los botones de propiedades
                    mostrarDetallesPropiedad(registro, true);
                });
            });

            grupo.appendChild(titulo);
            grupo.appendChild(contenido);
            historialRegistros.appendChild(grupo);
            
            // Añadir evento de clic al título para mostrar/ocultar el contenido
            titulo.addEventListener('click', function() {
                // Toggle para mostrar u ocultar el contenido
                if (contenido.style.display === 'none') {
                    contenido.style.display = 'block';
                    indicador.textContent = ' ▲';
                } else {
                    contenido.style.display = 'none';
                    indicador.textContent = ' ▼';
                }
            });
        });
    }

    function agruparRegistrosPorFecha(registros) {
        const registrosAgrupados = new Map();

        registros.forEach(registro => {
            const fechaEntrada = registro.fechaEntrada ? new Date(registro.fechaEntrada) : null;
            const fechaKey = obtenerFechaFormateada(fechaEntrada);

            if (!registrosAgrupados.has(fechaKey)) {
                registrosAgrupados.set(fechaKey, []);
            }

            registrosAgrupados.get(fechaKey).push(registro);
        });

        return registrosAgrupados;
    }

    function obtenerFechaFormateada(fecha) {
        if (!fecha) {
            return 'N/A';
        }

        const dia = fecha.getDate();
        const mes = fecha.getMonth() + 1; // Meses en JavaScript son de 0 a 11
        const año = fecha.getFullYear();

        return `${año}-${mes < 10 ? '0' : ''}${mes}-${dia < 10 ? '0' : ''}${dia}`;
    }

    registroForm.addEventListener('submit', function (event) {
        event.preventDefault();
        
        // Ya no recolectamos trabajadoras en el formulario de registro
        // Se añadirán después en el historial mediante el botón "Editar Horas Trabajadoras"
        
        const nuevoRegistro = {
            vivienda: registroForm.vivienda.value,
            fechaEntrada: registroForm.fechaEntrada.value || null,
            horaEntrada: registroForm.horaEntrada.value || '',
            fechaSalida: registroForm.fechaSalida.value || null,
            horaSalida: registroForm.horaSalida.value || '',
            horasLimpiadora: registroForm.horasLimpiadora.value || "0",
            extras: obtenerExtrasSeleccionados(),
            trabajadoras: [], // Inicializamos con un array vacío para mantener la estructura de datos
            anotaciones: "" // Inicializamos con un string vacío para las anotaciones
        };

        if ((nuevoRegistro.fechaEntrada || nuevoRegistro.fechaSalida) && nuevoRegistro.vivienda) {
            registros.push(nuevoRegistro);
            localStorage.setItem('registrosViviendas', JSON.stringify(registros));
            agregarRegistroAlHistorial(nuevoRegistro);
            registroForm.reset();
            /**
     * Muestra un formulario para editar la fecha y hora de entrada
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarEntrada(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-entrada');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-entrada');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Entrada';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de entrada
        const form = document.createElement('form');
        form.id = 'formEntrada-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de entrada
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Entrada:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaEntrada';
        fechaInput.value = registro.fechaEntrada || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de entrada
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Entrada:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaEntrada';
        horaInput.value = registro.horaEntrada || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaEntrada = fechaInput.value;
            const horaEntrada = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaEntrada = fechaEntrada;
            registro.horaEntrada = horaEntrada;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de salida
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarSalida(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-salida');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-salida');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Salida';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de salida
        const form = document.createElement('form');
        form.id = 'formSalida-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de salida
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Salida:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaSalida';
        fechaInput.value = registro.fechaSalida || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de salida
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Salida:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaSalida';
        horaInput.value = registro.horaSalida || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaSalida = fechaInput.value;
            const horaSalida = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaSalida = fechaSalida;
            registro.horaSalida = horaSalida;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    actualizarUI();
        } else {
            alert('Por favor, complete el nombre del piso y al menos una entrada o salida.');
        }
    });

    function obtenerExtrasSeleccionados() {
        return Array.from(document.querySelectorAll('input[name="extras"]:checked')).map(el => el.value);
    }

    function agregarRegistroAlHistorial(registro) {
        const div = document.createElement('div');
        div.classList.add('registro');
        
        // Añadir propiedad 'completado' si no existe
        if (registro.completado === undefined) {
            registro.completado = false;
        }
        
        // Preparar información de trabajadoras si existe
        let trabajadorasHTML = '';
        if (registro.trabajadoras && registro.trabajadoras.length > 0) {
            trabajadorasHTML = '<div class="trabajadoras-historial"><h4>Trabajadoras:</h4><ul>';
            trabajadorasHTML += registro.trabajadoras.map(t => `<li><strong>${t.nombre}:</strong> ${t.horas} horas</li>`).join('');
            trabajadorasHTML += '</ul></div>';
        }
        
        // Añadir propiedad 'anotaciones' si no existe
        if (registro.anotaciones === undefined) {
            registro.anotaciones = "";
        }
        
        div.innerHTML = `
            <p><strong>Vivienda:</strong> ${registro.vivienda}</p>
            <p><strong>Entrada:</strong> ${registro.fechaEntrada ? `${registro.fechaEntrada} a las ${registro.horaEntrada || ''}` : 'N/A'}</p>
            <p><strong>Salida:</strong> ${registro.fechaSalida ? `${registro.fechaSalida} a las ${registro.horaSalida || ''}` : 'N/A'}</p>
            <p><strong>Horas de Limpieza Total:</strong> ${registro.horasLimpiadora}</p>
            ${trabajadorasHTML}
            <p><strong>Extras:</strong> ${registro.extras.join(", ")}</p>
            ${registro.anotaciones ? `<p><strong>Anotaciones:</strong> ${registro.anotaciones}</p>` : ''}
            <button class="borrarBtn">Borrar</button>
            <button class="editarEntradaBtn">Editar Entrada</button>
            <button class="editarSalidaBtn">Editar Salida</button>
            <button class="editarTrabajadorasBtn">Editar Horas Trabajadoras</button>
            <button class="editarExtrasBtn">Editar Extras</button>
            <button class="anotacionesBtn">Anotaciones</button>
            <button class="volverBtn">Volver al Piso</button>
            <button class="completadoBtn ${registro.completado ? 'completado' : ''}">Hecho</button>
        `;
        
        // Si está completado, añadir clase a todo el registro
        if (registro.completado) {
            div.classList.add('registro-completado');
        }
        
        historialRegistros.appendChild(div);

        const borrarBtn = div.querySelector('.borrarBtn');
        borrarBtn.addEventListener('click', function () {
            if (confirm('¿Está seguro de que desea eliminar este registro?')) {
                borrarRegistro(registro);
                div.remove();
            }
        });

        const editarEntradaBtn = div.querySelector('.editarEntradaBtn');
        editarEntradaBtn.addEventListener('click', function () {
            editarEntrada(registro, div);
        });
        
        const editarSalidaBtn = div.querySelector('.editarSalidaBtn');
        editarSalidaBtn.addEventListener('click', function () {
            editarSalida(registro, div);
        });

        const editarExtrasBtn = div.querySelector('.editarExtrasBtn');
        editarExtrasBtn.addEventListener('click', function () {
            editarExtras(registro, div);
        });
        
        const editarTrabajadorasBtn = div.querySelector('.editarTrabajadorasBtn');
        editarTrabajadorasBtn.addEventListener('click', function () {
            editarHorasTrabajadoras(registro, div);
        });
        
        const anotacionesBtn = div.querySelector('.anotacionesBtn');
        anotacionesBtn.addEventListener('click', function () {
            editarAnotaciones(registro, div);
        });
        
        const completadoBtn = div.querySelector('.completadoBtn');
        completadoBtn.addEventListener('click', function () {
            registro.completado = !registro.completado;
            completadoBtn.classList.toggle('completado');
            div.classList.toggle('registro-completado');
            actualizarRegistro(registro);
            actualizarBotonesPropiedad(registro);
        });
        
        // Añadir evento al botón de volver al piso
        const volverBtn = div.querySelector('.volverBtn');
        volverBtn.addEventListener('click', function() {
            // Usar la misma función que se usa al hacer clic en los botones de propiedades
            mostrarDetallesPropiedad(registro, true);
        });
    }

    function agregarHoras(registro, div) {
        const inputDecimalHoras = prompt("Ingrese las horas de limpieza en formato decimal (por ejemplo, 4.45 para 4 horas y 45 minutos):", "4.45");

        if (inputDecimalHoras !== null && !isNaN(inputDecimalHoras)) {
            const decimalHoras = parseFloat(inputDecimalHoras);

            const horas = Math.floor(decimalHoras);
            const minutos = Math.round((decimalHoras % 1) * 60);

            registro.horasLimpiadora = horas + minutos / 60;
            actualizarRegistro(registro);
            actualizarVistaRegistro(div, registro);
        } else {
            alert("Formato de entrada no válido. Por favor, ingrese las horas en formato decimal.");
        }
    }

    function editarExtras(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-extras');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }

        // Lista de extras disponibles
        const extrasDisponibles = [
            'Agua', 
            'Vino Blanco', 
            'Vino Rosado', 
            'Vino Tinto', 
            'Caja de bombones naranja', 
            'Caja de bombones nestle', 
            'Bombones sueltos', 
            'Kitkat'
        ];
        
        // Obtener los extras actuales del registro
        const extrasActuales = registro.extras || [];
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-extras');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Extras';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para los extras
        const form = document.createElement('form');
        form.id = 'formExtras-' + Date.now(); // ID único para evitar conflictos
        
        // Crear un contenedor para los checkboxes con estilo grid
        const extrasGrid = document.createElement('div');
        extrasGrid.style.display = 'grid';
        extrasGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        extrasGrid.style.gap = '10px';
        
        // Crear campos para cada extra
        extrasDisponibles.forEach(extra => {
            const extraDiv = document.createElement('div');
            extraDiv.style.marginBottom = '10px';
            
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'extra';
            checkbox.value = extra;
            checkbox.id = `extra-${extra.replace(/\s+/g, '-')}-${Date.now()}`; // ID único
            checkbox.checked = extrasActuales.includes(extra);
            checkbox.style.marginRight = '8px';
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(extra));
            
            extraDiv.appendChild(label);
            extrasGrid.appendChild(extraDiv);
        });
        
        form.appendChild(extrasGrid);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            const extrasSeleccionados = [];
            
            // Recoger todos los extras seleccionados
            const checkboxes = form.querySelectorAll('input[name="extra"]:checked');
            checkboxes.forEach(checkbox => {
                extrasSeleccionados.push(checkbox.value);
            });
            
            // Actualizar el registro con los nuevos extras
            registro.extras = extrasSeleccionados;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }

    function borrarRegistro(registro) {
        registros = registros.filter(r => r !== registro);
        localStorage.setItem('registrosViviendas', JSON.stringify(registros));
        /**
     * Muestra un formulario para editar la fecha y hora de entrada
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarEntrada(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-entrada');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-entrada');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Entrada';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de entrada
        const form = document.createElement('form');
        form.id = 'formEntrada-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de entrada
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Entrada:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaEntrada';
        fechaInput.value = registro.fechaEntrada || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de entrada
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Entrada:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaEntrada';
        horaInput.value = registro.horaEntrada || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaEntrada = fechaInput.value;
            const horaEntrada = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaEntrada = fechaEntrada;
            registro.horaEntrada = horaEntrada;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de salida
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarSalida(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-salida');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-salida');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Salida';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de salida
        const form = document.createElement('form');
        form.id = 'formSalida-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de salida
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Salida:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaSalida';
        fechaInput.value = registro.fechaSalida || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de salida
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Salida:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaSalida';
        horaInput.value = registro.horaSalida || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaSalida = fechaInput.value;
            const horaSalida = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaSalida = fechaSalida;
            registro.horaSalida = horaSalida;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    actualizarUI();
    }

    function actualizarRegistro(registro) {
        localStorage.setItem('registrosViviendas', JSON.stringify(registros));
        /**
     * Muestra un formulario para editar la fecha y hora de entrada
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarEntrada(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-entrada');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-entrada');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Entrada';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de entrada
        const form = document.createElement('form');
        form.id = 'formEntrada-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de entrada
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Entrada:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaEntrada';
        fechaInput.value = registro.fechaEntrada || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de entrada
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Entrada:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaEntrada';
        horaInput.value = registro.horaEntrada || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaEntrada = fechaInput.value;
            const horaEntrada = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaEntrada = fechaEntrada;
            registro.horaEntrada = horaEntrada;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de salida
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarSalida(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-salida');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-salida');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Salida';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de salida
        const form = document.createElement('form');
        form.id = 'formSalida-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de salida
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Salida:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaSalida';
        fechaInput.value = registro.fechaSalida || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de salida
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Salida:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaSalida';
        horaInput.value = registro.horaSalida || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaSalida = fechaInput.value;
            const horaSalida = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaSalida = fechaSalida;
            registro.horaSalida = horaSalida;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    actualizarUI();
    }

    function actualizarVistaRegistro(div, registro) {
        // Actualizar las horas totales de limpieza
        const horasLimpiezaP = div.querySelector('p:nth-child(4)');
        if (horasLimpiezaP) {
            horasLimpiezaP.innerHTML = `<strong>Horas de Limpieza Total:</strong> ${registro.horasLimpiadora}`;
        }
        
        // Actualizar la información de trabajadoras si existe
        if (registro.trabajadoras && registro.trabajadoras.length > 0) {
            let trabajadorasDiv = div.querySelector('.trabajadoras-historial');
            
            // Si no existe el div de trabajadoras, crearlo
            if (!trabajadorasDiv) {
                // Crear el div de trabajadoras
                trabajadorasDiv = document.createElement('div');
                trabajadorasDiv.classList.add('trabajadoras-historial');
                
                // Insertar después de las horas de limpieza
                if (horasLimpiezaP) {
                    // Insertar después de las horas de limpieza
                    const extrasP = div.querySelector('p:nth-child(5)');
                    if (extrasP) {
                        div.insertBefore(trabajadorasDiv, extrasP);
                    } else {
                        div.appendChild(trabajadorasDiv);
                    }
                } else {
                    // Si no se encuentra el párrafo de horas, añadir al final
                    div.appendChild(trabajadorasDiv);
                }
            }
            
            // Actualizar el contenido del div de trabajadoras
            let trabajadorasHTML = '<h4>Trabajadoras:</h4><ul>';
            trabajadorasHTML += registro.trabajadoras.map(t => `<li><strong>${t.nombre}:</strong> ${t.horas} horas</li>`).join('');
            trabajadorasHTML += '</ul>';
            trabajadorasDiv.innerHTML = trabajadorasHTML;
        } else {
            // Si no hay trabajadoras, eliminar el div si existe
            const trabajadorasDiv = div.querySelector('.trabajadoras-historial');
            if (trabajadorasDiv) {
                div.removeChild(trabajadorasDiv);
            }
        }
        
        // Actualizar la lista de extras
        const extrasP = div.querySelector('p:nth-child(5)');
        if (extrasP) {
            extrasP.innerHTML = `<strong>Extras:</strong> ${registro.extras.join(", ")}`;
        }
        
        // Actualizar o añadir las anotaciones
        let anotacionesP = Array.from(div.querySelectorAll('p')).find(p => p.textContent.startsWith('Anotaciones:'));
        
        if (registro.anotaciones && registro.anotaciones.trim() !== '') {
            if (anotacionesP) {
                // Actualizar el párrafo existente
                anotacionesP.innerHTML = `<strong>Anotaciones:</strong> ${registro.anotaciones}`;
            } else {
                // Crear un nuevo párrafo para las anotaciones
                anotacionesP = document.createElement('p');
                anotacionesP.innerHTML = `<strong>Anotaciones:</strong> ${registro.anotaciones}`;
                
                // Insertar antes de los botones
                const primerBoton = div.querySelector('button');
                if (primerBoton) {
                    div.insertBefore(anotacionesP, primerBoton);
                } else {
                    div.appendChild(anotacionesP);
                }
            }
        } else if (anotacionesP) {
            // Si no hay anotaciones pero existe el párrafo, eliminarlo
            div.removeChild(anotacionesP);
        }
    }
    
    /**
     * Muestra un formulario para editar las horas de las trabajadoras
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarAnotaciones(registro, div) {
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-anotaciones');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-anotaciones');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Anotaciones';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para las anotaciones
        const form = document.createElement('form');
        form.id = 'formAnotaciones-' + Date.now(); // ID único para evitar conflictos
        
        // Crear textarea para las anotaciones
        const textareaDiv = document.createElement('div');
        textareaDiv.style.marginBottom = '15px';
        
        const textarea = document.createElement('textarea');
        textarea.name = 'anotaciones';
        textarea.placeholder = 'Escriba aquí sus anotaciones...';
        textarea.value = registro.anotaciones || '';
        textarea.style.width = '100%';
        textarea.style.minHeight = '100px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.resize = 'vertical';
        
        textareaDiv.appendChild(textarea);
        form.appendChild(textareaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener el texto de las anotaciones
            const anotaciones = textarea.value.trim();
            
            // Actualizar el registro con las nuevas anotaciones
            registro.anotaciones = anotaciones;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    function editarHorasTrabajadoras(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-trabajadoras');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }

        // Lista de trabajadoras disponibles
        const trabajadoras = ['Rosa', 'Nicole', 'Joan'];
        
        // Obtener las trabajadoras actuales del registro (si existen)
        const trabajadorasActuales = registro.trabajadoras || [];
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-trabajadoras');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Horas de Trabajadoras';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para las trabajadoras
        const form = document.createElement('form');
        form.id = 'formTrabajadoras-' + Date.now(); // ID único para evitar conflictos
        
        // Crear campos para cada trabajadora
        trabajadoras.forEach(trabajadora => {
            const trabajadoraActual = trabajadorasActuales.find(t => t.nombre === trabajadora);
            
            const trabajadoraDiv = document.createElement('div');
            trabajadoraDiv.style.marginBottom = '10px';
            trabajadoraDiv.style.display = 'flex';
            trabajadoraDiv.style.alignItems = 'center';
            
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.marginRight = '10px';
            label.style.width = '120px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'trabajadora';
            checkbox.value = trabajadora;
            checkbox.id = `trabajadora-${trabajadora}-${form.id.split('-')[1]}`; // ID único
            checkbox.checked = !!trabajadoraActual;
            checkbox.style.marginRight = '8px';
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(trabajadora));
            
            trabajadoraDiv.appendChild(label);
            
            const horasInput = document.createElement('input');
            horasInput.type = 'number';
            horasInput.name = `horas-${trabajadora}`;
            horasInput.placeholder = 'Horas';
            horasInput.min = '0';
            horasInput.step = '0.5';
            horasInput.value = trabajadoraActual ? trabajadoraActual.horas : '';
            horasInput.style.width = '80px';
            horasInput.style.padding = '5px';
            horasInput.style.border = '1px solid #ddd';
            horasInput.style.borderRadius = '4px';
            
            trabajadoraDiv.appendChild(horasInput);
            form.appendChild(trabajadoraDiv);
        });
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Añadir un indicador de estado para mostrar feedback visual
        const statusIndicator = document.createElement('div');
        statusIndicator.style.display = 'none';
        statusIndicator.style.padding = '8px';
        statusIndicator.style.marginTop = '10px';
        statusIndicator.style.borderRadius = '4px';
        statusIndicator.style.textAlign = 'center';
        statusIndicator.style.fontWeight = 'bold';
        formContainer.appendChild(statusIndicator);

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Deshabilitar el botón para evitar múltiples clics
            guardarBtn.disabled = true;
            guardarBtn.textContent = 'Guardando...';
            guardarBtn.style.backgroundColor = '#999';
            
            // Mostrar indicador de estado
            statusIndicator.style.display = 'block';
            statusIndicator.style.backgroundColor = '#f8d7da';
            statusIndicator.style.color = '#721c24';
            statusIndicator.textContent = 'Guardando cambios...';
            
            const trabajadorasSeleccionadas = [];
            let horasTotales = 0;
            
            trabajadoras.forEach(trabajadora => {
                const checkbox = document.getElementById(`trabajadora-${trabajadora}-${form.id.split('-')[1]}`);
                const horasInput = form.querySelector(`input[name="horas-${trabajadora}"]`);
                
                if (checkbox && checkbox.checked) {
                    // Si el checkbox está marcado, usar el valor de horas o 0 si está vacío
                    const horasTrabajadora = horasInput && horasInput.value ? parseFloat(horasInput.value) : 0;
                    trabajadorasSeleccionadas.push({
                        nombre: trabajadora,
                        horas: horasTrabajadora
                    });
                    horasTotales += horasTrabajadora;
                }
            });
            
            // Guardar una copia del registro original por si necesitamos revertir
            const registroOriginal = JSON.parse(JSON.stringify(registro));
            
            // Actualizar el registro con las nuevas trabajadoras
            registro.trabajadoras = trabajadorasSeleccionadas;
            
            // Actualizar las horas totales de limpieza
            registro.horasLimpiadora = horasTotales;
            
            try {
                // Actualizar el registro en localStorage con manejo de errores
                const registrosAnteriores = JSON.parse(localStorage.getItem('registrosViviendas')) || [];
                
                // Encontrar el índice del registro actual en el array
                const indiceRegistro = registrosAnteriores.findIndex(r => 
                    r.vivienda === registro.vivienda && 
                    r.fechaEntrada === registro.fechaEntrada && 
                    r.fechaSalida === registro.fechaSalida
                );
                
                if (indiceRegistro !== -1) {
                    // Actualizar el registro en el array
                    registrosAnteriores[indiceRegistro] = registro;
                    
                    // Guardar el array actualizado en localStorage
                    localStorage.setItem('registrosViviendas', JSON.stringify(registrosAnteriores));
                    
                    // Verificar que se guardó correctamente
                    const verificacion = JSON.parse(localStorage.getItem('registrosViviendas')) || [];
                    const registroVerificado = verificacion[indiceRegistro];
                    
                    if (registroVerificado && 
                        registroVerificado.trabajadoras && 
                        JSON.stringify(registroVerificado.trabajadoras) === JSON.stringify(trabajadorasSeleccionadas)) {
                        
                        // Actualizar la variable global de registros
                        registros = verificacion;
                        
                        // Actualizar la vista del registro específico
                        actualizarVistaRegistro(div, registro);
                        
                        // Actualizar los botones de propiedad si la función existe
                        if (typeof actualizarBotonesPropiedad === 'function') {
                            actualizarBotonesPropiedad(registro);
                        }
                        
                        // Mostrar mensaje de éxito
                        statusIndicator.style.backgroundColor = '#d4edda';
                        statusIndicator.style.color = '#155724';
                        statusIndicator.textContent = 'Cambios guardados correctamente';
                        
                        // Eliminar el formulario después de un breve retraso para mostrar el mensaje
                        setTimeout(() => {
                            if (div.contains(formContainer)) {
                                div.removeChild(formContainer);
                            }
                            
                            // Restaurar la posición de scroll
                            window.scrollTo({
                                top: scrollPosition,
                                behavior: 'auto'
                            });
                        }, 1500);
                    } else {
                        throw new Error('No se pudo verificar la actualización');
                    }
                } else {
                    throw new Error('No se encontró el registro para actualizar');
                }
            } catch (error) {
                console.error('Error al guardar los cambios:', error);
                
                // Revertir cambios en caso de error
                Object.assign(registro, registroOriginal);
                
                // Mostrar mensaje de error
                statusIndicator.style.backgroundColor = '#f8d7da';
                statusIndicator.style.color = '#721c24';
                statusIndicator.textContent = 'Error al guardar. Inténtalo de nuevo.';
                
                // Habilitar el botón de guardar nuevamente
                guardarBtn.disabled = false;
                guardarBtn.textContent = 'Guardar';
                guardarBtn.style.backgroundColor = '#EE1C25';
            }
        });
    }

    function actualizarBotonesPropiedad(registro) {
        // Obtener todos los botones de propiedades en las secciones de días
        const botonesHoy = viviendasHoy.querySelectorAll('.propiedad-btn');
        const botonesManana = viviendasManana.querySelectorAll('.propiedad-btn');
        const botonesPasadoManana = viviendasPasadoManana.querySelectorAll('.propiedad-btn');
        
        // Función para actualizar los botones según el registro
        const actualizarBoton = (boton, textoVivienda, textoFecha) => {
            // Verificar si el botón corresponde al registro que se está actualizando
            if (textoVivienda.includes(registro.vivienda) && 
                ((registro.fechaEntrada && textoFecha.includes(registro.fechaEntrada)) || 
                 (registro.fechaSalida && textoFecha.includes(registro.fechaSalida)))) {
                
                // Actualizar la clase del botón según el estado completado
                if (registro.completado) {
                    boton.classList.add('propiedad-completada');
                } else {
                    boton.classList.remove('propiedad-completada');
                }
            }
        };
        
        // Actualizar botones en cada sección
        botonesHoy.forEach(boton => {
            const textoVivienda = boton.querySelector('.vivienda-nombre').textContent;
            const textoFecha = boton.querySelector('.vivienda-detalle').textContent;
            actualizarBoton(boton, textoVivienda, textoFecha);
        });
        
        botonesManana.forEach(boton => {
            const textoVivienda = boton.querySelector('.vivienda-nombre').textContent;
            const textoFecha = boton.querySelector('.vivienda-detalle').textContent;
            actualizarBoton(boton, textoVivienda, textoFecha);
        });
        
        botonesPasadoManana.forEach(boton => {
            const textoVivienda = boton.querySelector('.vivienda-nombre').textContent;
            const textoFecha = boton.querySelector('.vivienda-detalle').textContent;
            actualizarBoton(boton, textoVivienda, textoFecha);
        });
    }

    function descargarCSV() {
        let csvContent = "\uFEFF"; // BOM para UTF-8
        csvContent += "Vivienda;Fecha Entrada;Hora Entrada;Fecha Salida;Hora Salida;Horas Limpieza;Trabajadoras;Extras;Anotaciones\r\n";
        registros.forEach(function (registro) {
            // Formatear la información de trabajadoras
            let trabajadorasInfo = '';
            if (registro.trabajadoras && registro.trabajadoras.length > 0) {
                trabajadorasInfo = registro.trabajadoras.map(t => `${t.nombre} (${t.horas}h)`).join(', ');
            }
            
            let row = [
                registro.vivienda,
                registro.fechaEntrada || '',
                registro.horaEntrada || '',
                registro.fechaSalida || '',
                registro.horaSalida || '',
                registro.horasLimpiadora,
                trabajadorasInfo,
                registro.extras.join(", "),
                registro.anotaciones || ''
            ].map(field => `"${field}"`).join(";");
            csvContent += row + "\r\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "registros_viviendas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    btnDescargarCSV.addEventListener('click', descargarCSV);
    
    // Añadir evento al botón de descargar CSV para Las Perlas
    const btnDescargarCSVPerlas = document.getElementById('btnDescargarCSVPerlas');
    btnDescargarCSVPerlas.addEventListener('click', descargarCSVPerlas);
    
    /**
     * Descarga un CSV específico para las propiedades de Las Perlas
     * - Ordenado por fecha de salida
     * - Sin horas de entrada/salida
     * - Con cálculo de días ocupados
     */
    function descargarCSVPerlas() {
        // Filtrar solo las propiedades que contienen "perla" en su nombre (case insensitive)
        const registrosPerlas = registros.filter(registro => 
            registro.vivienda.toLowerCase().includes('perla'));
        
        // Ordenar por fecha de salida
        registrosPerlas.sort((a, b) => {
            const fechaSalidaA = a.fechaSalida ? new Date(a.fechaSalida) : new Date(0);
            const fechaSalidaB = b.fechaSalida ? new Date(b.fechaSalida) : new Date(0);
            return fechaSalidaA - fechaSalidaB;
        });
        
        let csvContent = "\uFEFF"; // BOM para UTF-8
        csvContent += "Vivienda;Fecha Entrada;Fecha Salida;Días Ocupados;Horas Limpieza;Extras\r\n";
        
        let horasTotales = 0;
        registrosPerlas.forEach(function (registro) {
            // Calcular días ocupados
            let diasOcupados = 0;
            if (registro.fechaEntrada && registro.fechaSalida) {
                const fechaEntrada = new Date(registro.fechaEntrada);
                const fechaSalida = new Date(registro.fechaSalida);
                const diferenciaTiempo = fechaSalida.getTime() - fechaEntrada.getTime();
                diasOcupados = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
            }
            
            // Sumar las horas de limpieza
            horasTotales += registro.horasLimpiadora || 0;
            
            let row = [
                registro.vivienda,
                registro.fechaEntrada || '',
                registro.fechaSalida || '',
                diasOcupados,
                registro.horasLimpiadora,
                registro.extras.join(", ")
            ].map(field => `"${field}"`).join(";");
            
            csvContent += row + "\r\n";
        });
        
        // Añadir fila con el total de horas
        csvContent += `"TOTAL HORAS";"";"";"";"${horasTotales}";"";\r\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "registros_perlas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de entrada
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarEntrada(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-entrada');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-entrada');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Entrada';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de entrada
        const form = document.createElement('form');
        form.id = 'formEntrada-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de entrada
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Entrada:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaEntrada';
        fechaInput.value = registro.fechaEntrada || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de entrada
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Entrada:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaEntrada';
        horaInput.value = registro.horaEntrada || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const nuevaFecha = fechaInput.value;
            const nuevaHora = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaEntrada = nuevaFecha;
            registro.horaEntrada = nuevaHora;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de salida
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarSalida(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-salida');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-salida');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Salida';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de salida
        const form = document.createElement('form');
        form.id = 'formSalida-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de salida
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Salida:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaSalida';
        fechaInput.value = registro.fechaSalida || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de salida
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Salida:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaSalida';
        horaInput.value = registro.horaSalida || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const nuevaFecha = fechaInput.value;
            const nuevaHora = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaSalida = nuevaFecha;
            registro.horaSalida = nuevaHora;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    // Función para mostrar detalles de una propiedad cuando se hace clic en el botón
    function mostrarDetallesPropiedad(registro, desdeHistorial = false) {
        // Si viene desde el historial, intentar navegar a la sección de viviendas correspondiente
        if (desdeHistorial) {
            const hoy = new Date();
            const manana = new Date(hoy.getTime() + (24 * 60 * 60 * 1000));
            const pasadoManana = new Date(hoy.getTime() + (48 * 60 * 60 * 1000));
            
            const entradaDate = registro.fechaEntrada ? new Date(registro.fechaEntrada) : null;
            const salidaDate = registro.fechaSalida ? new Date(registro.fechaSalida) : null;
            
            // Determinar a qué sección navegar
            let seccionDestino = null;
            
            if (entradaDate && entradaDate.toDateString() === hoy.toDateString() || 
                salidaDate && salidaDate.toDateString() === hoy.toDateString()) {
                seccionDestino = "#viviendas-hoy";
            } else if (entradaDate && entradaDate.toDateString() === manana.toDateString() || 
                       salidaDate && salidaDate.toDateString() === manana.toDateString()) {
                seccionDestino = "#viviendas-manana";
            } else if (entradaDate && entradaDate.toDateString() === pasadoManana.toDateString() || 
                       salidaDate && salidaDate.toDateString() === pasadoManana.toDateString()) {
                seccionDestino = "#viviendas-pasado";
            }
            
            // Navegar a la sección correspondiente si se encontró
            if (seccionDestino) {
                document.querySelector(`a[href="${seccionDestino}"]`).click();
                
                // Resaltar el botón correspondiente
                setTimeout(() => {
                    const seccion = document.querySelector(seccionDestino);
                    const botones = seccion.querySelectorAll('.propiedad-btn');
                    
                    botones.forEach(boton => {
                        const textoVivienda = boton.querySelector('.vivienda-nombre').textContent;
                        const textoFecha = boton.querySelector('.vivienda-detalle').textContent;
                        
                        if (textoVivienda.includes(registro.vivienda) && 
                            ((registro.fechaEntrada && textoFecha.includes(registro.fechaEntrada)) || 
                             (registro.fechaSalida && textoFecha.includes(registro.fechaSalida)))) {
                            
                            // Resaltar temporalmente el botón encontrado
                            boton.classList.add('destacado');
                            setTimeout(() => {
                                boton.classList.remove('destacado');
                            }, 3000);
                            
                            // Desplazarse al botón
                            boton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }, 300); // Pequeño retraso para asegurar que la navegación se complete
                
                return; // Salir de la función si se navegó correctamente
            }
        }
        
        // Buscar el registro correspondiente en el historial
        const registroEnHistorial = document.querySelectorAll('#historialRegistros .registro');
        let encontrado = false;
        
        registroEnHistorial.forEach(elem => {
            const vivVienda = elem.querySelector('p:nth-child(1)').textContent;
            const vivEntrada = elem.querySelector('p:nth-child(2)').textContent;
            const vivSalida = elem.querySelector('p:nth-child(3)').textContent;
            
            // Verificar si este elemento coincide con el registro
            if (vivVienda.includes(registro.vivienda) && 
                ((registro.fechaEntrada && vivEntrada.includes(registro.fechaEntrada)) || 
                 (registro.fechaSalida && vivSalida.includes(registro.fechaSalida)))) {
                
                // Resaltar temporalmente el elemento encontrado
                elem.classList.add('destacado');
                setTimeout(() => {
                    elem.classList.remove('destacado');
                }, 3000);
                
                // Desplazarse al elemento
                elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Ir a la sección de historial
                document.querySelector('a[href="#historial"]').click();
                
                encontrado = true;
            }
        });
        
        if (!encontrado) {
            // Si no se encuentra en el historial, mostrar alerta como antes
            const detalles = `
                Vivienda: ${registro.vivienda}
                Entrada: ${registro.fechaEntrada ? `${registro.fechaEntrada} a las ${registro.horaEntrada || ''}` : 'N/A'}
                Salida: ${registro.fechaSalida ? `${registro.fechaSalida} a las ${registro.horaSalida || ''}` : 'N/A'}
                Horas de Limpieza: ${registro.horasLimpiadora}
                Extras: ${registro.extras.join(', ')}
            `;
            alert(detalles);
        }
    }

    /**
     * Muestra un formulario para editar la fecha y hora de entrada
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarEntrada(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-entrada');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-entrada');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Entrada';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de entrada
        const form = document.createElement('form');
        form.id = 'formEntrada-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de entrada
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Entrada:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaEntrada';
        fechaInput.value = registro.fechaEntrada || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de entrada
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Entrada:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaEntrada';
        horaInput.value = registro.horaEntrada || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaEntrada = fechaInput.value;
            const horaEntrada = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaEntrada = fechaEntrada;
            registro.horaEntrada = horaEntrada;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    /**
     * Muestra un formulario para editar la fecha y hora de salida
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarSalida(registro, div) {
        // Guardar la posición actual de scroll
        const scrollPosition = window.scrollY;
        
        // Verificar si ya existe un formulario de edición en este div
        const existingForm = div.querySelector('.form-editar-salida');
        if (existingForm) {
            // Si ya existe un formulario, lo eliminamos (toggle)
            div.removeChild(existingForm);
            return;
        }
        
        // Crear el contenedor del formulario inline
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-editar-salida');
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '15px';
        formContainer.style.borderRadius = '8px';
        formContainer.style.marginTop = '15px';
        formContainer.style.marginBottom = '15px';
        formContainer.style.border = '1px solid #ddd';

        // Título del formulario
        const titulo = document.createElement('h4');
        titulo.textContent = 'Editar Fecha y Hora de Salida';
        titulo.style.marginTop = '0';
        titulo.style.marginBottom = '10px';
        titulo.style.color = '#2c3e50';
        formContainer.appendChild(titulo);

        // Crear formulario para la fecha y hora de salida
        const form = document.createElement('form');
        form.id = 'formSalida-' + Date.now(); // ID único para evitar conflictos
        
        // Campo para la fecha de salida
        const fechaDiv = document.createElement('div');
        fechaDiv.style.marginBottom = '15px';
        
        const fechaLabel = document.createElement('label');
        fechaLabel.textContent = 'Fecha de Salida:';
        fechaLabel.style.display = 'block';
        fechaLabel.style.marginBottom = '5px';
        
        const fechaInput = document.createElement('input');
        fechaInput.type = 'date';
        fechaInput.name = 'fechaSalida';
        fechaInput.value = registro.fechaSalida || '';
        fechaInput.style.width = '100%';
        fechaInput.style.padding = '8px';
        fechaInput.style.border = '1px solid #ddd';
        fechaInput.style.borderRadius = '4px';
        
        fechaDiv.appendChild(fechaLabel);
        fechaDiv.appendChild(fechaInput);
        form.appendChild(fechaDiv);
        
        // Campo para la hora de salida
        const horaDiv = document.createElement('div');
        horaDiv.style.marginBottom = '15px';
        
        const horaLabel = document.createElement('label');
        horaLabel.textContent = 'Hora de Salida:';
        horaLabel.style.display = 'block';
        horaLabel.style.marginBottom = '5px';
        
        const horaInput = document.createElement('input');
        horaInput.type = 'time';
        horaInput.name = 'horaSalida';
        horaInput.value = registro.horaSalida || '';
        horaInput.style.width = '100%';
        horaInput.style.padding = '8px';
        horaInput.style.border = '1px solid #ddd';
        horaInput.style.borderRadius = '4px';
        
        horaDiv.appendChild(horaLabel);
        horaDiv.appendChild(horaInput);
        form.appendChild(horaDiv);
        
        // Botones de acción
        const botonesDiv = document.createElement('div');
        botonesDiv.style.display = 'flex';
        botonesDiv.style.justifyContent = 'flex-end';
        botonesDiv.style.gap = '10px';
        botonesDiv.style.marginTop = '15px';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.type = 'button';
        cancelarBtn.style.padding = '8px 15px';
        cancelarBtn.style.backgroundColor = '#6c757d';
        cancelarBtn.style.color = 'white';
        cancelarBtn.style.border = 'none';
        cancelarBtn.style.borderRadius = '5px';
        cancelarBtn.style.cursor = 'pointer';

        const guardarBtn = document.createElement('button');
        guardarBtn.textContent = 'Guardar';
        guardarBtn.type = 'button';
        guardarBtn.style.padding = '8px 15px';
        guardarBtn.style.backgroundColor = '#EE1C25';
        guardarBtn.style.color = 'white';
        guardarBtn.style.border = 'none';
        guardarBtn.style.borderRadius = '5px';
        guardarBtn.style.cursor = 'pointer';

        botonesDiv.appendChild(cancelarBtn);
        botonesDiv.appendChild(guardarBtn);

        form.appendChild(botonesDiv);
        formContainer.appendChild(form);
        
        // Insertar el formulario después del último botón en el div del registro
        div.appendChild(formContainer);

        // Evento para cerrar el formulario
        cancelarBtn.addEventListener('click', function() {
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll al cancelar
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            // Obtener los valores de fecha y hora
            const fechaSalida = fechaInput.value;
            const horaSalida = horaInput.value;
            
            // Actualizar el registro con los nuevos valores
            registro.fechaSalida = fechaSalida;
            registro.horaSalida = horaSalida;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Eliminar el formulario
            div.removeChild(formContainer);
            
            // Restaurar la posición de scroll
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        });
    }
    
    actualizarUI();
});
