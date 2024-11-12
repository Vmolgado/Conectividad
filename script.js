// Array de tipos de dispositivos a excluir
const excludedDevices = [
    "Concox AT1", "Concox AT4", "Concox GT06E", "Concox HVT001", "Jointech JT701",
    "KnightX 100", "Meitrack P88L", "Queclink GL100", "Queclink GL200", "Queclink GL300",
    "Queclink GL300W", "Queclink GL500M", "Queclink GL505", "Queclink GMT100", "Queclink GV57MG",
    "Queclink GV600MG", "Queclink GV628W", "Queclink GV75", "Queclink GV75M", "Queclink GV75W",
    "Suntech ST3940", "Suntech ST4940", "Suntech ST940", "Topflytech SolarGuardX 100",
    "Topflytech TLD2-D", "Topflytech TLP1-LF", "Topflytech TLP1-P", "Topflytech TLP1-SM",
    "Topflytech TLW2-12B"
];

// Función para determinar si un nombre debe ser excluido
function shouldExcludeByName(name) {
    const prefixes = ["--", "TTC", "PROG", "LABO", "LAB", "-", "TEMP", "MUESTRA"];
    return prefixes.some(prefix => name.startsWith(prefix));
}

// Función para obtener la fecha en el formato deseado
function formatDate(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} de ${month} de ${year}`;
}

// Mostrar la fecha actual en el header
document.getElementById('currentDate').textContent = formatDate(new Date());

let exportData = []; // Array para almacenar los datos calculados
let deviceSummary = {}; // Objeto para almacenar el resumen por tipo de dispositivo

function processFile() {
    const fileInput = document.getElementById('fileInput').files[0];
    if (fileInput) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
            analyzeUnits(jsonData);
        };
        reader.readAsBinaryString(fileInput);
    } else {
        alert('Por favor selecciona un archivo .xlsx.');
    }
}

function analyzeUnits(data) {
    const now = new Date();
    const tableBody = document.querySelector('#resultsTable tbody');
    const totalElement = document.getElementById('unidadesSinComunicar');
    tableBody.innerHTML = '';
    exportData = [];
    deviceSummary = {};
    let totalUnidades = 0;

    const headers = data[0];
    const nombreIndex = getColumnIndex(headers, "nombre");
    const tipoDispositivoIndex = getColumnIndex(headers, "tipo de dispositivo");
    const uidIndex = getColumnIndex(headers, "uid");
    const telefonoIndex = getColumnIndex(headers, "teléfono");
    const mensajeIndex = getColumnIndex(headers, "hora de último mensaje");
    const creadaIndex = getColumnIndex(headers, "creada");
    const gruposIndex = getColumnIndex(headers, "grupos");
    const camposPersonalizadosIndex = getColumnIndex(headers, "campos personalizados");

    if (nombreIndex === -1 || mensajeIndex === -1) {
        alert('No se encontró una columna crítica en el archivo.');
        return;
    }

    data.slice(1).forEach(row => {
        const nombre = row[nombreIndex];
        const tipoDispositivo = row[tipoDispositivoIndex];
        
        if (!excludedDevices.includes(tipoDispositivo) && !shouldExcludeByName(nombre)) {
            const uid = row[uidIndex] || 'Sin UID';
            const telefono = row[telefonoIndex] || 'Sin teléfono';
            const lastCommunicationStr = row[mensajeIndex];
            const creada = row[creadaIndex] || 'Sin datos';
            const grupos = row[gruposIndex] || 'Sin grupos';
            const camposPersonalizados = row[camposPersonalizadosIndex] || 'Sin campos personalizados';

            const lastCommunication = new Date(lastCommunicationStr);
            if (!isNaN(lastCommunication)) {
                const diffTime = Math.abs(now - lastCommunication);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferencia en días

                if (diffDays > 7) {
                    totalUnidades++;
                    const unitData = {
                        Nombre: nombre,
                        SD: (nombre || 'Sin datos').substring(0, 4),
                        "Tipo de dispositivo": tipoDispositivo,
                        UID: uid,
                        Teléfono: telefono,
                        "Hora de último mensaje": lastCommunication.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        Creada: creada,
                        Grupos: grupos,
                        "Campos personalizados": camposPersonalizados,
                        "Días Sin Comunicación": diffDays,
                        "No. Ticket": "",
                        "Fecha de Seguimiento": "",
                        "Estatus Unidad": "Pendiente",
                        "Contacto": "",
                        "Teléfono Contacto": "",
                        "Comentarios": ""
                    };

                    exportData.push(unitData);

                    const rowElement = document.createElement('tr');
                    rowElement.innerHTML = `
                        <td>${nombre}</td>
                        <td>${unitData.SD}</td>
                        <td>${tipoDispositivo}</td>
                        <td>${uid}</td>
                        <td>${telefono}</td>
                        <td>${lastCommunication.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                        <td>${creada}</td>
                        <td>${grupos}</td>
                        <td>${camposPersonalizados}</td>
                        <td>${diffDays} días</td>
                    `;
                    tableBody.appendChild(rowElement);

                    if (deviceSummary[tipoDispositivo]) {
                        deviceSummary[tipoDispositivo]++;
                    } else {
                        deviceSummary[tipoDispositivo] = 1;
                    }
                }
            }
        }
    });

    totalElement.style.display = 'block';
    displaySummary(totalUnidades);
    document.getElementById('iconButtons').style.display = 'block';
}

function getColumnIndex(headers, columnName) {
    const normalizedColumnName = columnName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (let i = 0; i < headers.length; i++) {
        if (headers[i]) {
            const headerName = headers[i].toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (headerName === normalizedColumnName) {
                return i;
            }
        }
    }
    return -1;
}

function displaySummary(totalUnidades) {
    const totalElement = document.getElementById('unidadesSinComunicar');
    let summaryText = `Unidades sin comunicar: ${totalUnidades}`;
    if (Object.keys(deviceSummary).length > 0) {
        summaryText += '<br><strong>Dispositivos por modelo:</strong><br>';
        for (const tipo in deviceSummary) {
            summaryText += `${tipo}: ${deviceSummary[tipo]}<br>`;
        }
    }

    totalElement.innerHTML = summaryText;
}

function clearAll() {
    exportData = [];
    deviceSummary = {};
    document.querySelector('#resultsTable tbody').innerHTML = '';
    document.getElementById('unidadesSinComunicar').style.display = 'none';
    document.getElementById('iconButtons'). style.display = 'none';
}

function exportToExcel() {
    if (exportData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unidades sin comunicar");
    XLSX.writeFile(wb, "unidades_sin_comunicar.xlsx");
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Unidades sin comunicar', 10, 10);

    const rows = [];
    const headers = ['Nombre', 'SD', 'Tipo de dispositivo', 'UID', 'Teléfono', 'Hora de último mensaje', 'Creada', 'Grupos', 'Campos personalizados', 'Días Sin Comunicación', 'No. Ticket', 'Fecha de Seguimiento', 'Estatus Unidad', 'Contacto', 'Teléfono Contacto', 'Comentarios'];

    exportData.forEach(item => {
        const row = [
            item.Nombre,
            item.SD,
            item["Tipo de dispositivo"],
            item.UID,
            item.Teléfono,
            item["Hora de último mensaje"],
            item.Creada,
            item.Grupos,
            item["Campos personalizados"],
            item["Días Sin Comunicación"],
            item["No. Ticket"],
            item["Fecha de Seguimiento"],
            item["Estatus Unidad"],
            item["Contacto"],
            item["Teléfono Contacto"],
            item["Comentarios"]
        ];
        rows.push(row);
    });

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 20,
    });

    doc.save('unidades_sin_comunicar.pdf');
}

function sendByEmail() {
    if (exportData.length === 0) {
        alert('No hay datos para enviar.');
        return;
    }

    alert('Simulación: Enviar por correo no está implementado aún. Necesitas un backend.');
}
