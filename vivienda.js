document.addEventListener('DOMContentLoaded', function () {
    // Todas las funciones están definidas en este archivo
    const registroForm = document.getElementById('registroForm');
    const historialRegistros = document.getElementById('historialRegistros');
    const btnDescargarCSV = document.getElementById('btnDescargarCSV');
    const viviendasHoy = document.getElementById('viviendasHoy');
    const viviendasManana = document.getElementById('viviendasManana');
    const viviendasPasadoManana = document.getElementById('viviendasPasadoManana');
    let registros = JSON.parse(localStorage.getItem('registrosViviendas')) || [];

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

    function mostrarHistorialRegistros() {
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
            titulo.textContent = fecha;

            const contenido = document.createElement('div');
            contenido.classList.add('contenido');

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
                    <button class="borrarBtn">Borrar</button>
                    <button class="editarTrabajadorasBtn">Editar Horas Trabajadoras</button>
                    <button class="editarExtrasBtn">Editar Extras</button>
                    <button class="completadoBtn ${registro.completado ? 'completado' : ''}">Hecho</button>
                    <button class="volverBtn">Volver al Piso</button>
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



                const editarExtrasBtn = entrada.querySelector('.editarExtrasBtn');
                editarExtrasBtn.addEventListener('click', function () {
                    editarExtras(registro, entrada);
                });
                
                const editarTrabajadorasBtn = entrada.querySelector('.editarTrabajadorasBtn');
                editarTrabajadorasBtn.addEventListener('click', function () {
                    editarHorasTrabajadoras(registro, entrada);
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
            trabajadoras: [] // Inicializamos con un array vacío para mantener la estructura de datos
        };

        if ((nuevoRegistro.fechaEntrada || nuevoRegistro.fechaSalida) && nuevoRegistro.vivienda) {
            registros.push(nuevoRegistro);
            localStorage.setItem('registrosViviendas', JSON.stringify(registros));
            agregarRegistroAlHistorial(nuevoRegistro);
            registroForm.reset();
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
        
        div.innerHTML = `
            <p><strong>Vivienda:</strong> ${registro.vivienda}</p>
            <p><strong>Entrada:</strong> ${registro.fechaEntrada ? `${registro.fechaEntrada} a las ${registro.horaEntrada || ''}` : 'N/A'}</p>
            <p><strong>Salida:</strong> ${registro.fechaSalida ? `${registro.fechaSalida} a las ${registro.horaSalida || ''}` : 'N/A'}</p>
            <p><strong>Horas de Limpieza Total:</strong> ${registro.horasLimpiadora}</p>
            ${trabajadorasHTML}
            <p><strong>Extras:</strong> ${registro.extras.join(", ")}</p>
            <button class="borrarBtn">Borrar</button>
            <button class="editarTrabajadorasBtn">Editar Horas Trabajadoras</button>
            <button class="editarExtrasBtn">Editar Extras</button>
            <button class="completadoBtn ${registro.completado ? 'completado' : ''}">Hecho</button>
            <button class="volverBtn">Volver al Piso</button>
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



        const editarExtrasBtn = div.querySelector('.editarExtrasBtn');
        editarExtrasBtn.addEventListener('click', function () {
            editarExtras(registro, div);
        });
        
        const editarTrabajadorasBtn = div.querySelector('.editarTrabajadorasBtn');
        editarTrabajadorasBtn.addEventListener('click', function () {
            editarHorasTrabajadoras(registro, div);
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
        const extras = registro.extras.join(", ");
        const nuevosExtras = window.prompt('Editar Extras:', extras);

        if (nuevosExtras !== null) {
            registro.extras = nuevosExtras.split(',').map(extra => extra.trim());
            actualizarRegistro(registro);
            actualizarVistaRegistro(div, registro);
        }
    }

    function borrarRegistro(registro) {
        registros = registros.filter(r => r !== registro);
        localStorage.setItem('registrosViviendas', JSON.stringify(registros));
        actualizarUI();
    }

    function actualizarRegistro(registro) {
        localStorage.setItem('registrosViviendas', JSON.stringify(registros));
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
    }
    
    /**
     * Muestra un formulario para editar las horas de las trabajadoras
     * @param {Object} registro - El registro de la vivienda
     * @param {HTMLElement} div - El elemento HTML del registro
     */
    function editarHorasTrabajadoras(registro, div) {
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
            checkbox.id = `trabajadora-${trabajadora}-${Date.now()}`; // ID único
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
        });

        // Evento para guardar los cambios
        guardarBtn.addEventListener('click', function() {
            const trabajadorasSeleccionadas = [];
            let horasTotales = 0;
            
            trabajadoras.forEach(trabajadora => {
                const checkbox = document.getElementById(`trabajadora-${trabajadora}-${form.id.split('-')[1]}`);
                const horasInput = form.querySelector(`input[name="horas-${trabajadora}"]`);
                
                if (checkbox && checkbox.checked && horasInput && horasInput.value) {
                    const horasTrabajadora = parseFloat(horasInput.value);
                    trabajadorasSeleccionadas.push({
                        nombre: trabajadora,
                        horas: horasTrabajadora
                    });
                    horasTotales += horasTrabajadora;
                }
            });
            
            // Actualizar el registro con las nuevas trabajadoras
            registro.trabajadoras = trabajadorasSeleccionadas;
            
            // Actualizar las horas totales de limpieza
            registro.horasLimpiadora = horasTotales;
            
            // Actualizar el registro en localStorage
            actualizarRegistro(registro);
            
            // Actualizar la vista del registro específico
            actualizarVistaRegistro(div, registro);
            
            // Actualizar los botones de propiedad si la función existe
            if (typeof actualizarBotonesPropiedad === 'function') {
                actualizarBotonesPropiedad(registro);
            }
            
            // Eliminar el formulario
            div.removeChild(formContainer);
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
        csvContent += "Vivienda;Fecha Entrada;Hora Entrada;Fecha Salida;Hora Salida;Horas Limpieza;Trabajadoras;Extras\r\n";
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
                registro.extras.join(", ")
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

    actualizarUI();
});
