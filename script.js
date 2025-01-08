/************************************************************
 * 1) LISTA DE DISPOSITIVOS EXCLUIDOS Y PREFIJOS
 ************************************************************/
const excludedDevices = [
  "Concox AT1", "Concox AT4", "Concox GT06E", "Concox HVT001", "Jointech JT701",
  "KnightX 100", "Meitrack P88L", "Queclink GL100", "Queclink GL200", "Queclink GL300",
  "Queclink GL300W", "Queclink GL500M", "Queclink GL505", "Queclink GMT100", "Queclink GV57MG",
  "Queclink GV600MG", "Queclink GV628W", "Queclink GV75", "Queclink GV75M", "Queclink GV75W",
  "Suntech ST3940", "Suntech ST4940", "Suntech ST940", "Topflytech SolarGuardX 100",
  "Topflytech TLD2-D", "Topflytech TLP1-LF", "Topflytech TLP1-P", "Topflytech TLP1-SM",
  "Topflytech TLW2-12B"
];

function shouldExcludeByName(name) {
  const prefixes = ["--", "TTC", "PROG", "LABO", "LAB", "-", "TEMP", "MUESTRA"];
  return prefixes.some(prefix => name.startsWith(prefix));
}

/************************************************************
 * 2) VARIABLES GLOBALES
 ************************************************************/
// Donde guardamos la info del Archivo Base (con datos trabajados)
let baseData = [];

// Donde guardamos la info del Archivo Nuevo (unidades que revisamos +7 días)
let newData = [];

// Resultado final tras la fusión
let mergedData = [];

/************************************************************
 * 3) MOSTRAR FECHA ACTUAL AL CARGAR
 ************************************************************/
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentDate').textContent = formatFullDate(new Date());
});

function formatFullDate(date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${day} de ${month} de ${year}`;
}

/************************************************************
 * 4) CARGAR ARCHIVO BASE (sin analizar días)
 ************************************************************/
function cargarArchivoBase() {
  const fileInput = document.getElementById('fileBase').files[0];
  if (!fileInput) {
    alert('Por favor selecciona un Archivo Base (.xlsx).');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

    baseData = parseExcelData(jsonData);
    alert('Archivo Base cargado. (Se usará para fusionar con el Nuevo)');
  };
  reader.readAsBinaryString(fileInput);
}

/************************************************************
 * 5) ANALIZAR ARCHIVO NUEVO (>7 días) Y FUSIONAR CON BASE
 ************************************************************/
function analizarArchivoNuevo() {
  const fileInput = document.getElementById('fileNuevo').files[0];
  if (!fileInput) {
    alert('Por favor selecciona un Archivo Nuevo (.xlsx).');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

    newData = parseExcelData(jsonData);

    // Fusión final, respetando lo ya trabajado en baseData
    fusionarArchivos();

    // Mostrar en tabla las unidades que excedan 7 días sin comunicar
    mostrarTabla(mergedData);

    alert('Archivo Nuevo analizado y fusionado con la Base.');
  };
  reader.readAsBinaryString(fileInput);
}

/************************************************************
 * 6) PARSEAR DATOS DE EXCEL A OBJETOS
 ************************************************************/
function parseExcelData(data) {
  if (!data || data.length === 0) return [];

  const headers = data[0];

  const nombreIndex = getColumnIndex(headers, "nombre");
  const tipoDispositivoIndex = getColumnIndex(headers, "tipo de dispositivo");
  const uidIndex = getColumnIndex(headers, "uid");
  const telefonoIndex = getColumnIndex(headers, "teléfono");
  const mensajeIndex = getColumnIndex(headers, "hora de último mensaje");
  const creadaIndex = getColumnIndex(headers, "creada");
  const gruposIndex = getColumnIndex(headers, "grupos");
  const camposPersonalizadosIndex = getColumnIndex(headers, "campos personalizados");

  // Campos de seguimiento (si existen en el archivo)
  const noTicketIndex = getColumnIndex(headers, "no. ticket");
  const fechaSeguimientoIndex = getColumnIndex(headers, "fecha de seguimiento");
  const estatusUnidadIndex = getColumnIndex(headers, "estatus unidad");
  const contactoIndex = getColumnIndex(headers, "contacto");
  const telefonoContactoIndex = getColumnIndex(headers, "teléfono contacto");
  const comentariosIndex = getColumnIndex(headers, "comentarios");

  const parsedArray = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const nombre = row[nombreIndex] || "";
    const tipoDispositivo = row[tipoDispositivoIndex] || "";
    const uid = row[uidIndex] || "";
    const telefono = row[telefonoIndex] || "";
    const lastMessage = row[mensajeIndex] || "";
    const creada = row[creadaIndex] || "";
    const grupos = row[gruposIndex] || "";
    const camposPersonalizados = row[camposPersonalizadosIndex] || "";

    const noTicket = noTicketIndex >= 0 ? (row[noTicketIndex] || "") : "";
    const fechaSeguimiento = fechaSeguimientoIndex >= 0 ? (row[fechaSeguimientoIndex] || "") : "";
    const estatusUnidad = estatusUnidadIndex >= 0 ? (row[estatusUnidadIndex] || "") : "";
    const contacto = contactoIndex >= 0 ? (row[contactoIndex] || "") : "";
    const telefonoContacto = telefonoContactoIndex >= 0 ? (row[telefonoContactoIndex] || "") : "";
    const comentarios = comentariosIndex >= 0 ? (row[comentariosIndex] || "") : "";

    parsedArray.push({
      "Nombre": nombre,
      "SD": nombre.substring(0, 4),
      "Tipo de dispositivo": tipoDispositivo,
      "UID": uid,
      "Teléfono": telefono,
      "Hora de último mensaje": lastMessage,
      "Creada": creada,
      "Grupos": grupos,
      "Campos personalizados": camposPersonalizados,
      "Días Sin Comunicación": 0,
      "No. Ticket": noTicket,
      "Fecha de Seguimiento": fechaSeguimiento,
      "Estatus Unidad": estatusUnidad || "Pendiente",
      "Contacto": contacto,
      "Teléfono Contacto": telefonoContacto,
      "Comentarios": comentarios
    });
  }
  return parsedArray;
}

/************************************************************
 * 7) FUSIONAR NUEVO (>7 días) CON BASE, RESPETANDO CAMPOS TRABAJADOS
 ************************************************************/
function fusionarArchivos() {
  const now = new Date();

  // Partimos de la base
  mergedData = [...baseData];

  // Recorremos las unidades del archivo nuevo
  for (const newUnit of newData) {
    // Excluimos tipos de dispositivo o nombres con prefijo indeseado
    if (excludedDevices.includes(newUnit["Tipo de dispositivo"]) || shouldExcludeByName(newUnit.Nombre)) {
      continue;
    }

    // Calculamos días sin comunicar
    const lastMsgDate = new Date(newUnit["Hora de último mensaje"]);
    if (!isNaN(lastMsgDate)) {
      const diffTime = Math.abs(now - lastMsgDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      newUnit["Días Sin Comunicación"] = diffDays;

      // Solo consideramos si >7 días
      if (diffDays > 7) {
        // Buscamos si ya existe en mergedData (por UID)
        const existingIndex = mergedData.findIndex(item => item.UID === newUnit.UID);

        // No existe => agregarlo como Pendiente (o con su estatus actual)
        if (existingIndex === -1) {
          if (!newUnit["Estatus Unidad"]) {
            newUnit["Estatus Unidad"] = "Pendiente";
          }
          mergedData.push(newUnit);
        } 
        else {
          // Sí existe => RESPETAMOS los campos trabajados
          const existingUnit = mergedData[existingIndex];

          // -- Si la unidad NO está en Pendiente (Ej: "Trabajada"), 
          //    AÚN ASÍ podemos decidir si actualizamos "Días Sin Comunicación" 
          //    o "Hora de último mensaje". Pero queremos mantener:
          //    "No. Ticket", "Fecha de Seguimiento", "Contacto", "Teléfono Contacto", 
          //    "Comentarios" y su "Estatus Unidad" actual.

          // OPCIÓN A: Si NO está en Pendiente, solo actualizamos "Días Sin Comunicación" 
          //          y "Hora de último mensaje", sin tocar lo demás.
          // OPCIÓN B: Si NO está en Pendiente, no lo actualizamos en absoluto.
          
          // Supongamos que SÍ queremos actualizar "Días Sin Comunicación" y "Hora..." 
          // para saber cuántos días realmente lleva sin comunicar, pero respetar
          // "No. Ticket", "Fecha de Seguimiento", "Estatus Unidad", etc.

          // Actualizamos "Días Sin Comunicación" siempre
          existingUnit["Días Sin Comunicación"] = diffDays;
          existingUnit["Hora de último mensaje"] = newUnit["Hora de último mensaje"];

          // Mantenemos "Estatus Unidad" tal como está (si es "Trabajada" o algo más).
          // Mantenemos "No. Ticket", "Fecha de Seguimiento", "Contacto", etc. 
          // tal como ya existía en existingUnit, SIN sobreescribirlo con newUnit.

          // Si prefieres que, si está en Pendiente, se actualicen también Teléfono, 
          // Tipo Dispositivo, etc., podrías hacerlo con:
          if (existingUnit["Estatus Unidad"] === "Pendiente") {
            // Por ejemplo:
            // existingUnit["Teléfono"] = newUnit["Teléfono"];
            // existingUnit["Tipo de dispositivo"] = newUnit["Tipo de dispositivo"];
          }
        }
      }
    }
  }
}

/************************************************************
 * 8) MOSTRAR TABLA (SOLO LAS UNIDADES >7 DÍAS)
 ************************************************************/
function mostrarTabla(data) {
  const tableBody = document.querySelector('#resultsTable tbody');
  tableBody.innerHTML = '';

  let totalUnidades = 0;
  let resumenDispositivos = {};

  // Insertamos filas de las unidades con >7 días sin comunicar
  for (const item of data) {
    const diffDays = item["Días Sin Comunicación"] || 0;
    if (diffDays > 7) {
      totalUnidades++;

      const tipo = item["Tipo de dispositivo"];
      if (!resumenDispositivos[tipo]) {
        resumenDispositivos[tipo] = 0;
      }
      resumenDispositivos[tipo]++;

      const rowElement = document.createElement('tr');
      rowElement.innerHTML = `
        <td>${item.Nombre}</td>
        <td>${item.SD}</td>
        <td>${tipo}</td>
        <td>${item.UID}</td>
        <td>${item.Teléfono}</td>
        <td>${formatDateCell(item["Hora de último mensaje"])}</td>
        <td>${item.Creada}</td>
        <td>${item.Grupos}</td>
        <td>${item["Campos personalizados"]}</td>
        <td>${diffDays} días</td>
      `;
      tableBody.appendChild(rowElement);
    }
  }

  // Mostrar el total en el <h4>
  const totalElement = document.getElementById('unidadesSinComunicar');
  let summaryText = `Unidades sin comunicar: ${totalUnidades}`;
  if (Object.keys(resumenDispositivos).length > 0) {
    summaryText += '<br><strong>Dispositivos por modelo:</strong><br>';
    for (const tipo in resumenDispositivos) {
      summaryText += `${tipo}: ${resumenDispositivos[tipo]}<br>`;
    }
  }
  totalElement.innerHTML = summaryText;
  totalElement.style.display = 'block';

  // Mostramos botones de export
  document.getElementById('iconButtons').style.display = 'block';
}

function formatDateCell(fechaStr) {
  if (!fechaStr) return "";
  const date = new Date(fechaStr);
  if (isNaN(date)) return fechaStr;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/************************************************************
 * 9) OTRAS FUNCIONES AUXILIARES
 ************************************************************/
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

/************************************************************
 * 10) EXPORTAR EXCEL, PDF, ETC.
 ************************************************************/
function exportToExcel() {
  if (!mergedData || mergedData.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(mergedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Unidades sin comunicar");
  XLSX.writeFile(wb, "unidades_sin_comunicar.xlsx");
}

function exportToPDF() {
  if (!mergedData || mergedData.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Unidades sin comunicar', 10, 10);

  const rows = [];
  const headers = [
    'Nombre', 'SD', 'Tipo de dispositivo', 'UID', 'Teléfono',
    'Hora de último mensaje', 'Creada', 'Grupos', 'Campos personalizados',
    'Días Sin Comunicación', 'No. Ticket', 'Fecha de Seguimiento',
    'Estatus Unidad', 'Contacto', 'Teléfono Contacto', 'Comentarios'
  ];

  for (const item of mergedData) {
    rows.push([
      item["Nombre"],
      item["SD"],
      item["Tipo de dispositivo"],
      item["UID"],
      item["Teléfono"],
      item["Hora de último mensaje"],
      item["Creada"],
      item["Grupos"],
      item["Campos personalizados"],
      item["Días Sin Comunicación"],
      item["No. Ticket"],
      item["Fecha de Seguimiento"],
      item["Estatus Unidad"],
      item["Contacto"],
      item["Teléfono Contacto"],
      item["Comentarios"]
    ]);
  }

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 20,
  });
  doc.save('unidades_sin_comunicar.pdf');
}

function sendByEmail() {
  if (!mergedData || mergedData.length === 0) {
    alert('No hay datos para enviar.');
    return;
  }
  alert('Simulación: Enviar por correo no está implementado aún.');
}

/************************************************************
 * 11) LIMPIAR TODO
 ************************************************************/
function clearAll() {
  // Lógica que ya tenías
  baseData = [];
  newData = [];
  mergedData = [];

  document.querySelector('#resultsTable tbody').innerHTML = '';
  const totalElement = document.getElementById('unidadesSinComunicar');
  totalElement.style.display = 'none';
  totalElement.innerHTML = '';

  document.getElementById('iconButtons').style.display = 'none';

  // Mostrar alerta y luego refrescar la página
  alert('Datos limpiados. Listo para cargar nuevos archivos.');
  window.location.reload();
}
