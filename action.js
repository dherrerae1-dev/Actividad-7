// ==========================================
// 1. CONFIGURACIÓN DE LA BASE DE DATOS (IndexedDB con Dexie)
// ==========================================
const db = new Dexie("RestauranteDB");

db.version(1).stores({
  pedidos: '++id, plato, bebida, extras, total, fecha'
});

// ==========================================
// 2. CONTROL DE PESTAÑAS (Navegación independiente)
// ==========================================
const tabBtnPedido = document.getElementById('tabBtnPedido');
const tabBtnHistorial = document.getElementById('tabBtnHistorial');
const vistaPedido = document.getElementById('vistaPedido');
const vistaHistorial = document.getElementById('vistaHistorial');

tabBtnPedido.addEventListener('click', () => {
  tabBtnPedido.classList.add('activo');
  tabBtnHistorial.classList.remove('activo');
  vistaPedido.classList.add('activo');
  vistaHistorial.classList.remove('activo');
});

tabBtnHistorial.addEventListener('click', async () => {
  tabBtnHistorial.classList.add('activo');
  tabBtnPedido.classList.remove('activo');
  vistaHistorial.classList.add('activo');
  vistaPedido.classList.remove('activo');
  // Cargar automáticamente el historial al cambiar a esta pestaña
  await actualizarHistorialPantalla();
});

// ==========================================
// 3. EVENTO DEL FORMULARIO (Guardar en IndexedDB)
// ==========================================
document.getElementById('formularioRestaurante').addEventListener('submit', async function(event) {
  event.preventDefault();

  const PRECIOS = {
    pizza: 12.00,
    hamburguesa: 7.50,
    pequena: 1.00,
    mediana: 1.50,
    grande: 2.00,
    papas: 2.50,
    helado: 1.80
  };

  let cuentaDetalle = "<strong>🧾 DETALLE DEL PEDIDO REGISTRADO:</strong><br><hr>";
  let total = 0;

  // 1. Plato Principal
  const plato = document.getElementById('platoPrincipal').value;
  if (plato === 'pizza') {
    total += PRECIOS.pizza;
    cuentaDetalle += `• Pizza Familiar: $${PRECIOS.pizza.toFixed(2)}<br>`;
  } else if (plato === 'hamburguesa') {
    total += PRECIOS.hamburguesa;
    cuentaDetalle += `• Hamburguesa con Queso: $${PRECIOS.hamburguesa.toFixed(2)}<br>`;
  }

  // 2. Bebida
  const bebidaRadio = document.querySelector('input[name="tamanoBebida"]:checked');
  const bebidaSeleccionada = bebidaRadio ? bebidaRadio.value : 'pequena';
  total += PRECIOS[bebidaSeleccionada];
  cuentaDetalle += `• Bebida (${bebidaSeleccionada}): $${PRECIOS[bebidaSeleccionada].toFixed(2)}<br>`;

  // 3. Extras
  const quierePapas = document.getElementById('extraPapas').checked;
  const quiereHelado = document.getElementById('extraHelado').checked;
  let listaExtras = [];

  if (quierePapas) {
    total += PRECIOS.papas;
    listaExtras.push("Papas Fritas");
    cuentaDetalle += `• Extra Papas Fritas: $${PRECIOS.papas.toFixed(2)}<br>`;
  }
  if (quiereHelado) {
    total += PRECIOS.helado;
    listaExtras.push("Helado");
    cuentaDetalle += `• Extra Helado: $${PRECIOS.helado.toFixed(2)}<br>`;
  }

  cuentaDetalle += `<hr><strong>💵 TOTAL: $${total.toFixed(2)}</strong>`;

  // Mostrar el recibo en pantalla
  const areaRecibo = document.getElementById('reciboRespuesta');
  areaRecibo.innerHTML = cuentaDetalle;
  areaRecibo.style.display = "block";

  // Guardar en IndexedDB usando Dexie
  try {
    await db.pedidos.add({
      plato: plato,
      bebida: bebidaSeleccionada,
      extras: listaExtras.join(", ") || "Ninguno",
      total: total,
      fecha: new Date().toLocaleString()
    });

    console.log("Pedido almacenado en IndexedDB con éxito.");
  } catch (error) {
    console.error("Error al guardar en IndexedDB: ", error);
  }
});

// ==========================================
// 4. FUNCIONALIDAD DE ADMINISTRACIÓN E HISTORIAL
// ==========================================
async function actualizarHistorialPantalla(filtro = "") {
  const divHistorial = document.getElementById('tablaHistorial');
  const todosLosPedidos = await db.pedidos.toArray();

  if (todosLosPedidos.length === 0) {
    divHistorial.innerHTML = "<p style='text-align:center; color:#6c757d; padding: 20px;'>No hay pedidos registrados en la base de datos todavía.</p>";
    return;
  }

  // Filtrar si el usuario escribió algo en el buscador
  const pedidosFiltrados = todosLosPedidos.filter(pedido => {
    const textoFiltro = filtro.toLowerCase();
    return pedido.plato.toLowerCase().includes(textoFiltro) ||
           pedido.bebida.toLowerCase().includes(textoFiltro) ||
           pedido.fecha.toLowerCase().includes(textoFiltro) ||
           pedido.extras.toLowerCase().includes(textoFiltro);
  });

  let gananciasTotales = 0;
  todosLosPedidos.forEach(p => gananciasTotales += p.total); // Ganancias globales

  let htmlContenido = `<div class="caja-resumen"><strong>💰 Caja Total Acumulada: $${gananciasTotales.toFixed(2)}</strong> (${todosLosPedidos.length} pedidos totales)</div><hr>`;

  if (pedidosFiltrados.length === 0) {
    htmlContenido += "<p style='text-align:center; color:#6c757d;'>No se encontraron coincidencias con la búsqueda.</p>";
  } else {
    pedidosFiltrados.reverse().forEach(function(pedido) {
      htmlContenido += `
        <div class="item-pedido">
          <strong>Pedido ID #${pedido.id}</strong> — 📅 ${pedido.fecha}<br>
          🍽️ Plato: ${pedido.plato} | 🥤 Bebida: ${pedido.bebida}<br>
          🍟 Extras: ${pedido.extras}<br>
          💵 Subtotal: <strong>$${pedido.total.toFixed(2)}</strong>
        </div>
      `;
    });
  }

  divHistorial.innerHTML = htmlContenido;
}

// Evento del buscador dinámico
document.getElementById('inputBuscar').addEventListener('input', async function(e) {
  await actualizarHistorialPantalla(e.target.value);
});

// BOTÓN: Vaciar toda la Base de Datos (IndexedDB)
document.getElementById('btnBorrarHistorial').addEventListener('click', async function() {
  const confirmar = confirm("⚠️ ¿Estás seguro de que deseas eliminar TODOS los pedidos de la base de datos IndexedDB?");
  if (confirmar) {
    await db.pedidos.clear();
    alert("Base de datos vaciada con éxito.");
    await actualizarHistorialPantalla();
  }
});

