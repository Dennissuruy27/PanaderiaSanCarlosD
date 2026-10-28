

/* =========================================
   PANADERÍA SAN CARLOS - INVENTARIO
========================================= */

const API_INVENTARIO =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/inventario";

const API_SUCURSALES =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/sucursales";

const API_PRODUCCION =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/produccion";

const API_LOGOUT =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios/logout";

const $ = id => document.getElementById(id);

const SUCURSALES = {
    1: "CENTRAL",
    2: "CHIVA",
    3: "BARCO",
    4: "HEYDI",
    5: "TERMINAL"
};

const NOMBRES_ROLES = {
    ADMIN: "Administrador",
    SUCURSAL: "Encargado de sucursal",
    VENDEDOR: "Vendedor",
    REPARTIDOR: "Repartidor"
};

let usuarioActual = null;
let rolActual = "";
let idSucursalUsuario = null;

let inventarioActual = [];
let productosCentrales = [];
let inventarioVenta = [];

let sugerenciasCompra = [];
let registrandoCompras = false;

let sugerenciasProduccion = [];
let creandoOrdenProduccion = false;

/* =========================================
   SESIÓN
========================================= */

function verificarSesion() {

    const guardado = sessionStorage.getItem("usuario");

    if (!guardado) {
        window.location.replace("index.html");
        return false;
    }

    try {
        usuarioActual = JSON.parse(guardado);

        if (!usuarioActual || typeof usuarioActual !== "object") {
            throw new Error("Sesión inválida");
        }

    } catch (error) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return false;
    }

    rolActual = String(
        usuarioActual.rol || ""
    ).trim().toUpperCase();

    idSucursalUsuario = Number(
        usuarioActual.idSucursal ??
        usuarioActual.id_sucursal ??
        0
    );

    $("nombreUsuario").textContent =
        usuarioActual.nombreUsuario ||
        usuarioActual.usuario ||
        "Usuario";

    $("rolUsuario").textContent =
        NOMBRES_ROLES[rolActual] || rolActual;

    $("btnCerrarSesion").addEventListener(
        "click",
        cerrarSesion
    );

    mostrarSucursalUsuario();

    if (rolActual !== "ADMIN" && rolActual !== "SUCURSAL") {

        mostrarMensaje(
            "No tienes permisos para utilizar Inventario.",
            "error"
        );

        deshabilitarOperaciones();
        return false;
    }

    if (rolActual === "SUCURSAL") {

        if (!SUCURSALES[idSucursalUsuario]) {

            mostrarMensaje(
                "No tienes una sucursal válida asignada.",
                "error"
            );

            deshabilitarOperaciones();
            return false;
        }

        document.querySelectorAll(".solo-admin").forEach(elemento => {
            elemento.hidden = true;
        });

        $("filtroUbicacion").value = String(idSucursalUsuario);
        $("filtroUbicacion").disabled = true;

        $("ventaSucursal").value = String(idSucursalUsuario);
        $("ventaSucursal").disabled = true;
    }

    return true;
}

function deshabilitarOperaciones() {

    document.querySelectorAll(
        "form button, #btnActualizar, #btnMovimientos, " +
        "#btnGenerarSugerencias, #btnRegistrarCompras, " +
        "#btnGenerarSugerenciasProduccion"
    ).forEach(boton => {
        boton.disabled = true;
    });
}

async function mostrarSucursalUsuario() {

    const elemento = $("sucursalUsuario");
    const id = idSucursalUsuario;

    if (!Number.isInteger(id) || id <= 0) {
        elemento.textContent = "Sin sucursal asignada";
        return;
    }

    elemento.textContent =
        "Sucursal: " + (SUCURSALES[id] || `#${id}`);

    try {

        const respuesta = await fetch(
            `${API_SUCURSALES}/${encodeURIComponent(id)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        if (datos.sucursal?.nombreSucursal) {
            elemento.textContent =
                "Sucursal: " + datos.sucursal.nombreSucursal;
        }

    } catch (error) {
        console.error(error);
    }
}

async function cerrarSesion() {

    const boton = $("btnCerrarSesion");

    boton.disabled = true;
    boton.textContent = "Cerrando sesión...";

    try {

        const respuesta = await fetch(API_LOGOUT, {
            method: "POST",
            credentials: "include"
        });

        if (!respuesta.ok) {
            throw new Error("Error HTTP " + respuesta.status);
        }

        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            "No se pudo cerrar sesión en el servidor.",
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Cerrar sesión";
    }
}

/* =========================================
   COMUNICACIÓN CON JAVA
========================================= */

async function solicitarAPI(url, opciones = {}) {

    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        }
    });

    const texto = await respuesta.text();

    let datos = null;

    try {
        datos = texto ? JSON.parse(texto) : null;
    } catch (error) {
        throw new Error("El servidor no devolvió JSON válido.");
    }

    if (!respuesta.ok) {

        if (respuesta.status === 401) {
            throw new Error(
                "Tu sesión ha expirado. Inicia sesión nuevamente."
            );
        }

        if (respuesta.status === 403) {
            throw new Error(
                "No tienes permisos para esta operación."
            );
        }

        throw new Error(
            datos?.mensaje || `Error HTTP ${respuesta.status}`
        );
    }

    if (
        datos &&
        !Array.isArray(datos) &&
        (
            datos.estado === "ERROR" ||
            (
                datos.idSalida !== undefined &&
                Number(datos.idSalida) <= 0
            )
        )
    ) {
        throw new Error(
            datos.mensaje || "La operación fue rechazada."
        );
    }

    return datos;
}

function solicitar(ruta, opciones = {}) {
    return solicitarAPI(API_INVENTARIO + ruta, opciones);
}

function enviar(ruta, datos) {
    return solicitar(ruta, {
        method: "POST",
        body: JSON.stringify(datos)
    });
}

/* =========================================
   UTILIDADES
========================================= */

function mostrarMensaje(texto, tipo = "exito") {

    const elemento = $("mensaje");

    elemento.textContent = texto;
    elemento.className = "mensaje " + tipo;
}

function mostrarMensajeSugerencias(texto, tipo = "exito") {

    const elemento = $("mensajeSugerencias");

    elemento.textContent = texto;
    elemento.className = "mensaje " + tipo;
}

function mostrarMensajeProduccion(texto, tipo = "exito") {

    const elemento = $("mensajeSugerenciasProduccion");

    elemento.textContent = texto;
    elemento.className = "mensaje " + tipo;
}

function numero(valor) {
    return Number(valor ?? 0);
}

function formatoNumero(valor) {
    return numero(valor).toLocaleString("es-GT", {
        maximumFractionDigits: 3
    });
}

function escapar(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function obtenerLista(datos, propiedad) {

    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos?.[propiedad])) {
        return datos[propiedad];
    }

    throw new Error("Formato de lista no reconocido.");
}

function obtenerCantidad(id) {

    const valor = Number($(id).value);

    if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
    }

    return valor;
}

function obtenerMotivo(id) {

    const motivo = $(id).value.trim();

    if (!motivo) {
        throw new Error("Debes indicar un motivo.");
    }

    return motivo;
}

function obtenerIdProducto(id) {

    const valor = Number($(id).value);

    if (!Number.isInteger(valor) || valor <= 0) {
        throw new Error("Selecciona un producto válido.");
    }

    return valor;
}

/* =========================================
   TIPOS DE PRODUCTOS
========================================= */

function esMateriaPrima(producto) {

    return String(
        producto.tipoProducto || ""
    ).trim().toUpperCase() === "MATERIA_PRIMA";
}

function esProductoTerminado(producto) {

    return String(
        producto.tipoProducto || ""
    ).trim().toUpperCase() === "PRODUCTO_TERMINADO";
}

/* =========================================
   OPCIONES DE PRODUCTOS
========================================= */

function cargarOpciones(idSelect, productos) {

    const select = $(idSelect);
    const anterior = select.value;

    select.innerHTML =
        '<option value="">Seleccione un producto</option>';

    productos.forEach(producto => {

        const opcion = document.createElement("option");

        opcion.value = producto.idProducto;

        opcion.textContent =
            producto.nombreProducto +
            " (Disponible: " +
            formatoNumero(producto.existencia) +
            ")";

        select.appendChild(opcion);
    });

    if (
        Array.from(select.options).some(
            opcion => opcion.value === anterior
        )
    ) {
        select.value = anterior;
    }
}

/* =========================================
   BUSCADOR DE MATERIAS PRIMAS
========================================= */

function cargarBuscadorMateriasPrimas() {

    const datalist = $("listaMateriasPrimas");
    const materias = productosCentrales.filter(esMateriaPrima);

    datalist.innerHTML = "";

    materias.forEach(producto => {

        const opcion = document.createElement("option");

        opcion.value = producto.nombreProducto;

        datalist.appendChild(opcion);
    });

    sincronizarMateriaPrima();
}

function sincronizarMateriaPrima() {

    const texto = $("entradaBusqueda")
        .value.trim().toLowerCase();

    const coincidencias = productosCentrales
        .filter(esMateriaPrima)
        .filter(producto =>
            String(producto.nombreProducto)
                .trim()
                .toLowerCase() === texto
        );

    $("entradaProducto").value =
        coincidencias.length === 1
            ? coincidencias[0].idProducto
            : "";
}

/* =========================================
   PRODUCTOS DE FÁBRICA
========================================= */

async function cargarProductosCentrales() {

    if (rolActual !== "ADMIN") return;

    const datos = await solicitar("/existencias");

    productosCentrales = obtenerLista(datos, "existencias");

    cargarBuscadorMateriasPrimas();

    cargarOpciones(
        "salidaCentralProducto",
        productosCentrales
    );

    cargarOpciones(
        "despachoProducto",
        productosCentrales.filter(esProductoTerminado)
    );
}

/* =========================================
   INVENTARIO DE SUCURSAL
========================================= */

async function cargarInventarioSucursal(idSucursal) {

    if (!SUCURSALES[idSucursal]) {
        throw new Error("Sucursal no válida.");
    }

    if (
        rolActual === "SUCURSAL" &&
        idSucursal !== idSucursalUsuario
    ) {
        throw new Error("No puedes consultar otra sucursal.");
    }

    const datos = await solicitar(`/sucursal/${idSucursal}`);

    return obtenerLista(datos, "inventario");
}

/* =========================================
   CONSULTAR INVENTARIO
========================================= */

async function cargarInventario() {

    const ubicacion = $("filtroUbicacion").value;

    $("tablaInventario").innerHTML = `
        <tr>
            <td colspan="7" class="sin-datos">
                Cargando inventario...
            </td>
        </tr>
    `;

    try {

        if (ubicacion === "central") {

            if (rolActual !== "ADMIN") {
                throw new Error("No puedes consultar fábrica.");
            }

            const datos = await solicitar("/existencias");

            inventarioActual = obtenerLista(
                datos,
                "existencias"
            );

            $("ubicacionActual").textContent = "Fábrica";

        } else {

            const idSucursal = Number(ubicacion);

            inventarioActual =
                await cargarInventarioSucursal(idSucursal);

            $("ubicacionActual").textContent =
                SUCURSALES[idSucursal] || "Sucursal";
        }

        mostrarInventario();

    } catch (error) {

        console.error(error);

        inventarioActual = [];
        mostrarInventario();

        mostrarMensaje(error.message, "error");
    }
}

/* =========================================
   MOSTRAR INVENTARIO CON FILTROS
========================================= */

function mostrarInventario() {

    const busqueda = $("buscarProducto")
        .value.trim().toLowerCase();

    const tipoSeleccionado = $("filtroTipoProducto")
        .value.trim().toUpperCase();

    const filtrados = inventarioActual.filter(producto => {

        const nombre = String(
            producto.nombreProducto || ""
        ).trim().toLowerCase();

        const tipo = String(
            producto.tipoProducto || ""
        ).trim().toUpperCase();

        const coincideBusqueda = nombre.includes(busqueda);

        const coincideTipo =
            tipoSeleccionado === "TODOS" ||
            tipo === tipoSeleccionado;

        return coincideBusqueda && coincideTipo;
    });

    $("totalProductos").textContent = filtrados.length;

    $("totalUnidades").textContent = formatoNumero(
        filtrados.reduce(
            (total, producto) =>
                total + numero(producto.existencia),
            0
        )
    );

    $("totalBajos").textContent =
        filtrados.filter(producto => {

            const minimo = numero(
                producto.existenciaMinima ??
                producto.stockMinimo
            );

            return numero(producto.existencia) < minimo;

        }).length;

    const tbody = $("tablaInventario");

    if (!filtrados.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="sin-datos">
                    No se encontraron productos con los filtros seleccionados.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filtrados.map(producto => {

        const minimo = numero(
            producto.existenciaMinima ??
            producto.stockMinimo
        );

        const baja = numero(producto.existencia) < minimo;

        const tipo = String(
            producto.tipoProducto || ""
        ).trim().toUpperCase();

        let nombreTipo = tipo;

        if (tipo === "MATERIA_PRIMA") {
            nombreTipo = "Materia prima";
        }

        if (tipo === "PRODUCTO_TERMINADO") {
            nombreTipo = "Producto terminado";
        }

        return `
            <tr>
                <td>${escapar(producto.idProducto)}</td>
                <td>${escapar(producto.nombreProducto)}</td>
                <td>${escapar(nombreTipo)}</td>
                <td>${escapar(producto.unidadMedida)}</td>
                <td>
                    <strong>
                        ${formatoNumero(producto.existencia)}
                    </strong>
                </td>
                <td>${formatoNumero(minimo)}</td>
                <td>
                    <span class="estado ${baja ? "bajo" : "ok"}">
                        ${baja ? "Existencia baja" : "Disponible"}
                    </span>
                </td>
            </tr>
        `;

    }).join("");
}

/* =========================================
   PRODUCTOS DE SUCURSAL
========================================= */

async function cargarProductosVenta() {

    const idSucursal =
        rolActual === "ADMIN"
            ? Number($("ventaSucursal").value)
            : idSucursalUsuario;

    inventarioVenta =
        await cargarInventarioSucursal(idSucursal);

    cargarOpciones(
        "ventaProducto",
        inventarioVenta.filter(esProductoTerminado)
    );
}

/* =========================================
   HISTORIAL
========================================= */

async function cargarMovimientos() {

    try {

        const ruta =
            rolActual === "ADMIN"
                ? "/movimientos"
                : `/movimientos/sucursal/${idSucursalUsuario}`;

        const datos = await solicitar(ruta);

        const movimientos = obtenerLista(
            datos,
            "movimientos"
        );

        const tbody = $("tablaMovimientos");

        if (!movimientos.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="sin-datos">
                        No hay movimientos registrados.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = movimientos.map(movimiento => {

            const tipo = String(
                movimiento.tipoMovimiento || ""
            ).toUpperCase();

            const ubicacion =
                movimiento.nombreSucursal ||
                (
                    movimiento.idSucursal
                        ? SUCURSALES[movimiento.idSucursal] ||
                        `Sucursal #${movimiento.idSucursal}`
                        : "Fábrica"
                );

            return `
                <tr>
                    <td>${escapar(movimiento.idMovimiento)}</td>
                    <td>${escapar(movimiento.fecha)}</td>
                    <td>${escapar(movimiento.nombreProducto)}</td>
                    <td>
                        <span class="estado ${tipo === "ENTRADA" ? "ok" : "bajo"}">
                            ${escapar(tipo)}
                        </span>
                    </td>
                    <td>${formatoNumero(movimiento.cantidadM)}</td>
                    <td>${escapar(ubicacion)}</td>
                    <td>${escapar(movimiento.motivo)}</td>
                </tr>
            `;

        }).join("");

    } catch (error) {

        console.error(error);

        $("tablaMovimientos").innerHTML = `
            <tr>
                <td colspan="7" class="sin-datos">
                    No se pudo cargar el historial.
                </td>
            </tr>
        `;

        mostrarMensaje(error.message, "error");
    }
}

/* =========================================
   ACTUALIZAR TODO
========================================= */

async function actualizarTodo() {

    if (rolActual === "ADMIN") {

        try {
            await cargarProductosCentrales();
        } catch (error) {
            console.error(error);
            mostrarMensaje(error.message, "error");
        }
    }

    await cargarInventario();

    try {
        await cargarProductosVenta();
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message, "error");
    }

    await cargarMovimientos();
}

/* =========================================
   REGISTRAR OPERACIONES
========================================= */

async function ejecutarFormulario(evento, ruta, datos) {

    evento.preventDefault();

    const formulario = evento.currentTarget;

    const boton = formulario.querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;

    try {

        const respuesta = await enviar(ruta, datos);

        mostrarMensaje(
            respuesta?.mensaje ||
            "Operación realizada correctamente.",
            "exito"
        );

        formulario.reset();

        if (rolActual === "SUCURSAL") {
            $("ventaSucursal").value =
                String(idSucursalUsuario);
        }

        await actualizarTodo();

    } catch (error) {

        console.error(error);
        mostrarMensaje(error.message, "error");

    } finally {

        boton.disabled = false;
    }
}

/* =========================================
   SUGERENCIAS DE COMPRA
========================================= */

async function alternarSugerencias() {

    const panel = $("panelSugerencias");
    const boton = $("btnGenerarSugerencias");

    if (registrandoCompras) return;

    if (!panel.hidden) {
        panel.hidden = true;
        boton.textContent = "Generar sugerencias";
        return;
    }

    await generarSugerencias();

    if (!panel.hidden) {
        boton.textContent = "Cerrar sugerencias";
    }
}

async function generarSugerencias() {

    if (rolActual !== "ADMIN" || registrandoCompras) return;

    const boton = $("btnGenerarSugerencias");
    boton.disabled = true;

    try {

        const datos = await solicitar("/existencias");
        const productos = obtenerLista(datos, "existencias");

        sugerenciasCompra = productos
            .filter(producto => {

                const minimo = numero(
                    producto.existenciaMinima ??
                    producto.stockMinimo
                );

                return (
                    esMateriaPrima(producto) &&
                    numero(producto.existencia) < minimo
                );
            })
            .map(producto => {

                const existencia = numero(producto.existencia);

                const minimo = numero(
                    producto.existenciaMinima ??
                    producto.stockMinimo
                );

                const faltante = minimo - existencia;

                return {
                    idProducto: Number(producto.idProducto),
                    nombreProducto: producto.nombreProducto,
                    unidadMedida: producto.unidadMedida,
                    existencia,
                    minimo,
                    faltante,
                    cantidad: faltante,
                    seleccionado: true
                };
            });

        $("panelSugerencias").hidden = false;

        mostrarTablaSugerencias();

        mostrarMensajeSugerencias(
            sugerenciasCompra.length
                ? "Sugerencias generadas correctamente."
                : "No hay materias primas por debajo del mínimo.",
            "exito"
        );

    } catch (error) {

        console.error(error);

        mostrarMensajeSugerencias(
            "Error al generar sugerencias: " + error.message,
            "error"
        );

    } finally {

        boton.disabled = false;
    }
}

function seleccionarTodasSugerencias(seleccionar) {

    if (registrandoCompras) return;

    sugerenciasCompra.forEach(producto => {
        producto.seleccionado = seleccionar;
    });

    mostrarTablaSugerencias();
}

function mostrarTablaSugerencias() {

    const tbody = $("tablaSugerencias");

    if (!sugerenciasCompra.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="sin-datos">
                    No hay materias primas que requieran compra.
                </td>
            </tr>
        `;

        actualizarTotalSugerencias();
        return;
    }

    tbody.innerHTML = "";

    sugerenciasCompra.forEach(producto => {

        const fila = document.createElement("tr");

        const celdaCheck = document.createElement("td");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = producto.seleccionado;
        checkbox.disabled = registrandoCompras;

        checkbox.setAttribute(
            "aria-label",
            "Seleccionar " + producto.nombreProducto
        );

        checkbox.addEventListener("change", () => {
            producto.seleccionado = checkbox.checked;
            actualizarTotalSugerencias();
        });

        celdaCheck.appendChild(checkbox);
        fila.appendChild(celdaCheck);

        function agregarCelda(texto) {
            const td = document.createElement("td");
            td.textContent = texto;
            fila.appendChild(td);
        }

        agregarCelda(producto.nombreProducto);

        agregarCelda(
            formatoNumero(producto.existencia) +
            " " + (producto.unidadMedida || "")
        );

        agregarCelda(formatoNumero(producto.minimo));
        agregarCelda(formatoNumero(producto.faltante));

        const celdaCantidad = document.createElement("td");
        const input = document.createElement("input");

        input.type = "number";
        input.min = "0.001";
        input.step = "0.001";
        input.value = producto.cantidad;
        input.disabled = registrandoCompras;

        input.setAttribute(
            "aria-label",
            "Cantidad para " + producto.nombreProducto
        );

        input.addEventListener("input", () => {
            producto.cantidad =
                input.value.trim() === ""
                    ? NaN
                    : Number(input.value);
        });

        celdaCantidad.appendChild(input);
        fila.appendChild(celdaCantidad);
        tbody.appendChild(fila);
    });

    actualizarTotalSugerencias();
}

function actualizarTotalSugerencias() {

    const total = sugerenciasCompra.filter(
        producto => producto.seleccionado
    ).length;

    const cantidadTotal = sugerenciasCompra.length;

    $("totalSugerencias").textContent =
        total + " de " + cantidadTotal +
        " materias primas seleccionadas";

    $("btnRegistrarCompras").disabled =
        total === 0 || registrandoCompras;

    const checkTodos = $("checkSeleccionarTodos");

    checkTodos.checked =
        cantidadTotal > 0 &&
        total === cantidadTotal;

    checkTodos.indeterminate =
        total > 0 &&
        total < cantidadTotal;

    checkTodos.disabled =
        cantidadTotal === 0 ||
        registrandoCompras;
}

async function registrarComprasSugeridas() {

    if (registrandoCompras || rolActual !== "ADMIN") return;

    const seleccionados = sugerenciasCompra.filter(
        producto => producto.seleccionado
    );

    if (!seleccionados.length) {

        mostrarMensajeSugerencias(
            "Selecciona al menos una materia prima.",
            "error"
        );

        return;
    }

    for (const producto of seleccionados) {

        if (
            !Number.isFinite(producto.cantidad) ||
            producto.cantidad <= 0
        ) {

            mostrarMensajeSugerencias(
                "Cantidad inválida para " +
                producto.nombreProducto,
                "error"
            );

            return;
        }
    }

    const confirmar = window.confirm(
        "¿Confirmas que ya recibiste las materias primas?\n\n" +
        "Se registrarán " +
        seleccionados.length +
        " entradas en fábrica."
    );

    if (!confirmar) return;

    registrandoCompras = true;

    const boton = $("btnRegistrarCompras");
    boton.disabled = true;
    boton.textContent = "Registrando entradas...";

    $("btnGenerarSugerencias").disabled = true;

    mostrarTablaSugerencias();

    let registrados = 0;
    let errorRegistro = null;

    try {

        for (const producto of seleccionados) {

            try {

                await enviar("/entrada", {
                    idProducto: producto.idProducto,
                    cantidadM: producto.cantidad,
                    motivo: "Compra sugerida - abastecimiento"
                });

                registrados++;

            } catch (error) {

                errorRegistro = {
                    producto: producto.nombreProducto,
                    mensaje: error.message
                };

                break;
            }
        }

        await actualizarTodo();

        registrandoCompras = false;
        await generarSugerencias();

        if (errorRegistro) {

            mostrarMensajeSugerencias(
                "Se registraron " + registrados +
                " entradas. Falló " +
                errorRegistro.producto + ": " +
                errorRegistro.mensaje +
                ". Revisa el inventario antes de reintentar.",
                "error"
            );

        } else {

            mostrarMensajeSugerencias(
                "Se registraron correctamente " +
                registrados +
                " entradas de materia prima.",
                "exito"
            );
        }

    } catch (error) {

        console.error(error);

        mostrarMensajeSugerencias(
            "No se pudo completar la actualización. " +
            "Revisa el inventario antes de reintentar.",
            "error"
        );

    } finally {

        registrandoCompras = false;
        boton.textContent = "Registrar recepción seleccionada";
        $("btnGenerarSugerencias").disabled = false;
        mostrarTablaSugerencias();
    }
}

/* =========================================
   SUGERENCIAS DE PRODUCCIÓN
========================================= */

async function alternarSugerenciasProduccion() {

    if (rolActual !== "ADMIN" || creandoOrdenProduccion) return;

    const panel = $("panelSugerenciasProduccion");
    const boton = $("btnGenerarSugerenciasProduccion");

    if (!panel.hidden) {
        panel.hidden = true;
        boton.textContent = "Generar sugerencias de producción";
        return;
    }

    boton.disabled = true;

    try {

        await generarSugerenciasProduccion();

        panel.hidden = false;
        boton.textContent = "Cerrar sugerencias de producción";

    } catch (error) {

        console.error(error);
        mostrarMensajeProduccion(error.message, "error");

    } finally {

        boton.disabled = false;
    }
}

async function generarSugerenciasProduccion() {

    const datos = await solicitar("/existencias");
    const productos = obtenerLista(datos, "existencias");

    sugerenciasProduccion = productos
        .filter(producto => {

            const minimo = numero(
                producto.existenciaMinima ??
                producto.stockMinimo
            );

            return (
                esProductoTerminado(producto) &&
                numero(producto.existencia) < minimo
            );
        })
        .map(producto => {

            const existencia = numero(producto.existencia);

            const minimo = numero(
                producto.existenciaMinima ??
                producto.stockMinimo
            );

            const faltante = minimo - existencia;

            return {
                idProducto: Number(producto.idProducto),
                nombreProducto: producto.nombreProducto,
                unidadMedida: producto.unidadMedida,
                existencia,
                minimo,
                faltante,
                cantidad: Math.ceil(faltante),
                ordenCreada: false
            };
        });

    mostrarTablaSugerenciasProduccion();

    mostrarMensajeProduccion(
        sugerenciasProduccion.length
            ? "Sugerencias de producción generadas correctamente."
            : "No hay productos terminados por debajo del mínimo.",
        "exito"
    );
}

function mostrarTablaSugerenciasProduccion() {

    const tbody = $("tablaSugerenciasProduccion");

    tbody.innerHTML = "";

    if (!sugerenciasProduccion.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="sin-datos">
                    No hay productos terminados que requieran producción.
                </td>
            </tr>
        `;

        return;
    }

    sugerenciasProduccion.forEach(producto => {

        const fila = document.createElement("tr");

        function agregarCelda(texto) {
            const celda = document.createElement("td");
            celda.textContent = texto;
            fila.appendChild(celda);
            return celda;
        }

        agregarCelda(producto.nombreProducto);

        agregarCelda(
            formatoNumero(producto.existencia) +
            " " + (producto.unidadMedida || "")
        );

        agregarCelda(formatoNumero(producto.minimo));
        agregarCelda(formatoNumero(producto.faltante));

        const celdaCantidad = document.createElement("td");
        const input = document.createElement("input");

        input.type = "number";
        input.min = "1";
        input.step = "1";
        input.value = producto.cantidad;
        input.disabled = producto.ordenCreada;

        input.setAttribute(
            "aria-label",
            "Cantidad a producir de " + producto.nombreProducto
        );

        input.addEventListener("input", () => {
            producto.cantidad =
                input.value.trim() === ""
                    ? NaN
                    : Number(input.value);
        });

        celdaCantidad.appendChild(input);
        fila.appendChild(celdaCantidad);

        const celdaAccion = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn-principal";

        boton.textContent = producto.ordenCreada
            ? "Orden creada"
            : "Crear orden";

        boton.disabled = producto.ordenCreada;

        boton.addEventListener("click", () => {
            crearOrdenProduccionSugerida(producto, boton, input);
        });

        celdaAccion.appendChild(boton);
        fila.appendChild(celdaAccion);

        tbody.appendChild(fila);
    });
}

async function crearOrdenProduccionSugerida(producto, boton, input) {

    if (
        rolActual !== "ADMIN" ||
        creandoOrdenProduccion ||
        producto.ordenCreada
    ) {
        return;
    }

    const cantidad = Number(producto.cantidad);

    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {

        mostrarMensajeProduccion(
            "La cantidad para " +
            producto.nombreProducto +
            " debe ser un número entero mayor que cero.",
            "error"
        );

        return;
    }

    const confirmar = window.confirm(
        "¿Crear orden de producción?\n\n" +
        "Producto: " + producto.nombreProducto + "\n" +
        "Cantidad: " + cantidad + "\n\n" +
        "La orden quedará pendiente en Producción. " +
        "Todavía no se descontarán ingredientes."
    );

    if (!confirmar) return;

    creandoOrdenProduccion = true;

    boton.disabled = true;
    boton.textContent = "Creando orden...";
    input.disabled = true;

    $("btnGenerarSugerenciasProduccion").disabled = true;

    try {

        const respuesta = await solicitarAPI(API_PRODUCCION, {
            method: "POST",
            body: JSON.stringify({
                idProducto: producto.idProducto,
                cantidadP: cantidad
            })
        });

        producto.ordenCreada = true;

        boton.textContent = "Orden creada";

        mostrarMensajeProduccion(
            (respuesta?.mensaje ||
                "Orden de producción creada correctamente.") +
            " Puedes consultarla en el módulo Producción.",
            "exito"
        );

        window.alert(
            "Orden creada correctamente.\n\n" +
            "Producto: " + producto.nombreProducto + "\n" +
            "Cantidad: " + cantidad + "\n\n" +
            "Puedes verla en el módulo Producción."
        );

    } catch (error) {

        console.error(error);

        mostrarMensajeProduccion(error.message, "error");

        window.alert(
            "No se pudo crear la orden:\n" + error.message
        );

        boton.disabled = false;
        boton.textContent = "Crear orden";
        input.disabled = false;

    } finally {

        creandoOrdenProduccion = false;

        $("btnGenerarSugerenciasProduccion").disabled = false;
    }
}

/* =========================================
   EVENTOS
========================================= */

function configurarEventos() {

    /* FILTRO POR UBICACIÓN */

    $("filtroUbicacion").addEventListener(
        "change",
        cargarInventario
    );

    /* NUEVO FILTRO POR TIPO DE PRODUCTO */

    $("filtroTipoProducto").addEventListener(
        "change",
        mostrarInventario
    );

    /* BUSCADOR DE PRODUCTOS */

    $("buscarProducto").addEventListener(
        "input",
        mostrarInventario
    );

    /* BUSCADOR DE MATERIAS PRIMAS */

    $("entradaBusqueda").addEventListener(
        "input",
        sincronizarMateriaPrima
    );

    /* CAMBIO DE SUCURSAL PARA SALIDAS */

    $("ventaSucursal").addEventListener(
        "change",
        async () => {

            try {
                await cargarProductosVenta();
            } catch (error) {
                mostrarMensaje(error.message, "error");
            }
        }
    );

    /* ACTUALIZAR DATOS */

    $("btnActualizar").addEventListener(
        "click",
        actualizarTodo
    );

    /* HISTORIAL */

    $("btnMovimientos").addEventListener(
        "click",
        cargarMovimientos
    );

    /* SUGERENCIAS DE COMPRA */

    $("btnGenerarSugerencias").addEventListener(
        "click",
        alternarSugerencias
    );

    $("checkSeleccionarTodos").addEventListener(
        "change",
        evento => {
            seleccionarTodasSugerencias(evento.target.checked);
        }
    );

    $("btnRegistrarCompras").addEventListener(
        "click",
        registrarComprasSugeridas
    );

    /* SUGERENCIAS DE PRODUCCIÓN */

    $("btnGenerarSugerenciasProduccion").addEventListener(
        "click",
        alternarSugerenciasProduccion
    );

    /* =====================================
       ENTRADA DE MATERIA PRIMA
    ===================================== */

    $("formEntrada").addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();

            if (rolActual !== "ADMIN") {

                mostrarMensaje(
                    "Solo el administrador puede registrar entradas.",
                    "error"
                );

                return;
            }

            try {

                sincronizarMateriaPrima();

                const idProducto =
                    obtenerIdProducto("entradaProducto");

                const producto = productosCentrales.find(
                    p => Number(p.idProducto) === idProducto
                );

                if (!producto || !esMateriaPrima(producto)) {

                    throw new Error(
                        "Selecciona una materia prima válida."
                    );
                }

                await ejecutarFormulario(
                    evento,
                    "/entrada",
                    {
                        idProducto,
                        cantidadM: obtenerCantidad("entradaCantidad"),
                        motivo: obtenerMotivo("entradaMotivo")
                    }
                );

            } catch (error) {
                mostrarMensaje(error.message, "error");
            }
        }
    );

    /* =====================================
       SALIDA DE FÁBRICA
    ===================================== */

    $("formSalidaCentral").addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();

            if (rolActual !== "ADMIN") {

                mostrarMensaje(
                    "No tienes permisos para esta operación.",
                    "error"
                );

                return;
            }

            try {

                const idProducto =
                    obtenerIdProducto("salidaCentralProducto");

                await ejecutarFormulario(
                    evento,
                    "/salida",
                    {
                        idProducto,
                        cantidadM: obtenerCantidad(
                            "salidaCentralCantidad"
                        ),
                        motivo: obtenerMotivo(
                            "salidaCentralMotivo"
                        ),
                        idSucursal: null
                    }
                );

            } catch (error) {
                mostrarMensaje(error.message, "error");
            }
        }
    );

    /* =====================================
       DESPACHO A SUCURSAL
    ===================================== */

    $("formDespacho").addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();

            if (rolActual !== "ADMIN") {

                mostrarMensaje(
                    "Solo el administrador puede despachar.",
                    "error"
                );

                return;
            }

            try {

                const idSucursal =
                    Number($("despachoSucursal").value);

                if (!SUCURSALES[idSucursal]) {

                    throw new Error(
                        "Selecciona una sucursal válida."
                    );
                }

                const idProducto =
                    obtenerIdProducto("despachoProducto");

                const producto = productosCentrales.find(
                    p => Number(p.idProducto) === idProducto
                );

                if (!producto || !esProductoTerminado(producto)) {

                    throw new Error(
                        "Solo puedes despachar productos terminados."
                    );
                }

                await ejecutarFormulario(
                    evento,
                    "/despacho",
                    {
                        idProducto,
                        idSucursal,
                        cantidadM: obtenerCantidad(
                            "despachoCantidad"
                        ),
                        motivo: obtenerMotivo(
                            "despachoMotivo"
                        )
                    }
                );

            } catch (error) {
                mostrarMensaje(error.message, "error");
            }
        }
    );

    /* =====================================
       SALIDA DE SUCURSAL
    ===================================== */

    $("formSalidaSucursal").addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();

            try {

                const idSucursal =
                    rolActual === "ADMIN"
                        ? Number($("ventaSucursal").value)
                        : idSucursalUsuario;

                if (!SUCURSALES[idSucursal]) {

                    throw new Error(
                        "Selecciona una sucursal válida."
                    );
                }

                const idProducto =
                    obtenerIdProducto("ventaProducto");

                const producto = inventarioVenta.find(
                    p => Number(p.idProducto) === idProducto
                );

                if (!producto || !esProductoTerminado(producto)) {

                    throw new Error(
                        "Solo puedes registrar salidas de productos terminados."
                    );
                }

                await ejecutarFormulario(
                    evento,
                    "/sucursal/salida",
                    {
                        idProducto,
                        idSucursal,
                        cantidadM: obtenerCantidad(
                            "ventaCantidad"
                        ),
                        motivo: obtenerMotivo(
                            "ventaMotivo"
                        )
                    }
                );

            } catch (error) {
                mostrarMensaje(error.message, "error");
            }
        }
    );
}

/* =========================================
   INICIALIZACIÓN
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!verificarSesion()) return;

        configurarEventos();

        await actualizarTodo();
    }
);







