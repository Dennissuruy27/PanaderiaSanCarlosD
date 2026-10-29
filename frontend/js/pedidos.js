
"use strict";

/* ============================================================
   PANADERÍA SAN CARLOS
   MÓDULO DE PEDIDOS Y ASIGNACIÓN DE REPARTIDORES
============================================================ */

document.addEventListener("DOMContentLoaded", async function () {

    // ========================================================
    // CONFIGURACIÓN DE API
    // ========================================================

    const BASE_API =
        "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api";

    const API_PEDIDOS = BASE_API + "/pedidos";
    const API_PRODUCTOS = BASE_API + "/productos";
    const API_SUCURSALES = BASE_API + "/sucursales";
    const API_USUARIOS = BASE_API + "/usuarios";
    const API_LOGOUT = API_USUARIOS + "/logout";

    // ========================================================
    // ELEMENTOS DEL HTML
    // ========================================================

    const $ = id => document.getElementById(id);

    const tablaPedidos = $("tablaPedidos");
    const totalPedidos = $("totalPedidos");
    const buscarPedido = $("buscarPedido");
    const filtroEstado = $("filtroEstado");
    const filtroSucursal = $("filtroSucursal");

    const btnNuevoPedido = $("btnNuevoPedido");
    const btnActualizar = $("btnActualizar");

    const modalPedido = $("modalPedido");
    const formPedido = $("formPedido");
    const pedidoSucursal = $("pedidoSucursal");
    const pedidoUsuario = $("pedidoUsuario");
    const pedidoIdUsuario = $("pedidoIdUsuario");
    const pedidoObservaciones = $("pedidoObservaciones");
    const productoPedido = $("productoPedido");
    const cantidadPedido = $("cantidadPedido");
    const btnAgregarProducto = $("btnAgregarProducto");
    const tablaProductosPedido = $("tablaProductosPedido");
    const totalNuevoPedido = $("totalNuevoPedido");
    const btnGuardarPedido = $("btnGuardarPedido");

    const modalDetallePedido = $("modalDetallePedido");
    const tablaDetallePedido = $("tablaDetallePedido");
    const panelAgregarDetalle = $("panelAgregarDetalle");
    const detalleProductoNuevo = $("detalleProductoNuevo");
    const detalleCantidadNueva = $("detalleCantidadNueva");
    const btnAgregarDetalleExistente =
        $("btnAgregarDetalleExistente");

    const panelAsignarRepartidor =
        $("panelAsignarRepartidor");

    const selectRepartidor =
        $("selectRepartidor");

    const btnGuardarRepartidor =
        $("btnGuardarRepartidor");

    const detalleRepartidor =
        $("detalleRepartidor");

    const nombreUsuario = $("nombreUsuario");
    const rolUsuario = $("rolUsuario");
    const sucursalUsuario = $("sucursalUsuario");
    const btnCerrarSesion = $("btnCerrarSesion");

    // ========================================================
    // VARIABLES
    // ========================================================

    let pedidos = [];
    let productos = [];
    let sucursales = [];
    let repartidores = [];

    let productosNuevoPedido = [];
    let pedidoDetalleActual = null;

    let guardandoPedido = false;
    let guardandoRepartidor = false;
    let operacionDetalleEnCurso = false;
    let operacionEstadoEnCurso = false;

    let disponibilidadPedidos = new Map();

    let usuarioActual = null;
    let rolActual = "";
    let esAdmin = false;
    let esSucursal = false;

    let errorCatalogoRepartidores = "";

    // ========================================================
    // VALIDAR SESIÓN
    // ========================================================

    const usuarioGuardado =
        sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
        window.location.replace("index.html");
        return;
    }

    try {

        usuarioActual = JSON.parse(usuarioGuardado);

        if (
            !usuarioActual ||
            !Number.isInteger(Number(usuarioActual.idUsuario)) ||
            Number(usuarioActual.idUsuario) <= 0
        ) {
            throw new Error("Sesión inválida");
        }

    } catch (error) {

        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return;
    }

    rolActual = String(
        usuarioActual.rol || ""
    ).toUpperCase().trim();

    esAdmin = rolActual === "ADMIN";
    esSucursal = rolActual === "SUCURSAL";

    const idUsuarioActual =
        Number(usuarioActual.idUsuario);

    const idSucursalActual =
        Number(usuarioActual.idSucursal);

    const nombresRoles = {
        ADMIN: "Administrador",
        SUCURSAL: "Encargado de sucursal",
        VENDEDOR: "Vendedor",
        REPARTIDOR: "Repartidor"
    };

    nombreUsuario.textContent =
        usuarioActual.nombreUsuario ||
        usuarioActual.usuario ||
        "Usuario";

    rolUsuario.textContent =
        nombresRoles[rolActual] || "Sin rol";

    // ========================================================
    // FUNCIONES AUXILIARES
    // ========================================================

    function campo(objeto, ...nombres) {

        if (!objeto) return undefined;

        for (const nombre of nombres) {

            if (
                objeto[nombre] !== undefined &&
                objeto[nombre] !== null
            ) {
                return objeto[nombre];
            }
        }

        return undefined;
    }

    function escaparHTML(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function dinero(valor) {

        const numero = Number(valor);

        return "Q " + (
            Number.isFinite(numero) ? numero : 0
        ).toLocaleString("es-GT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function mostrarMensaje(id, texto, tipo = "error") {

        const elemento = $(id);

        if (!elemento) return;

        elemento.textContent = texto || "";

        elemento.className =
            elemento.classList.contains("mensaje-formulario")
                ? "mensaje-formulario"
                : "mensaje";

        if (texto) {
            elemento.classList.add(tipo);
        }
    }

    function mostrarError(error, id = "mensajePedidos") {

        console.error(error);

        mostrarMensaje(
            id,
            error?.message ||
                "Ocurrió un error inesperado.",
            "error"
        );
    }

    function idPedidoDe(pedido) {

        return Number(
            campo(pedido, "idPedido", "ID_PEDIDO")
        );
    }

    function idSucursalDe(pedido) {

        return Number(
            campo(pedido, "idSucursal", "ID_SUCURSAL")
        );
    }

    function estadoDe(pedido) {

        return String(
            campo(pedido, "estado", "ESTADO") || ""
        ).toUpperCase().trim();
    }

    function idRepartidorDe(pedido) {

        const id = Number(
            campo(
                pedido,
                "idRepartidor",
                "ID_REPARTIDOR"
            )
        );

        return Number.isInteger(id) && id > 0
            ? id
            : null;
    }

    function nombreRepartidorDe(pedido) {

        const id = idRepartidorDe(pedido);

        if (!id) {
            return "Sin asignar";
        }

        const nombre = campo(
            pedido,
            "nombreRepartidor",
            "NOMBRE_REPARTIDOR"
        );

        if (nombre && String(nombre).trim()) {
            return String(nombre);
        }

        const repartidor = repartidores.find(
            item => item.idUsuario === id
        );

        return repartidor
            ? repartidor.nombreUsuario
            : "Repartidor #" + id;
    }

    function valorActivo(valor) {

        return valor === 1 ||
            valor === true ||
            valor === "1";
    }

    function normalizarLista(datos, propiedad) {

        if (Array.isArray(datos)) {
            return datos;
        }

        if (Array.isArray(datos?.[propiedad])) {
            return datos[propiedad];
        }

        if (Array.isArray(datos?.data)) {
            return datos.data;
        }

        throw new Error(
            "El servidor devolvió un formato no reconocido."
        );
    }

    function formatearFecha(valor) {

        if (!valor) return "—";

        const texto = String(valor);

        const coincidencia = texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

        if (coincidencia) {

            return (
                coincidencia[3] + "/" +
                coincidencia[2] + "/" +
                coincidencia[1]
            );
        }

        return texto;
    }

    function claseEstado(estado) {

        switch (estado) {

            case "PENDIENTE":
                return "estado-pendiente";

            case "APROBADO":
                return "estado-aprobado";

            case "EN PRODUCCION":
                return "estado-produccion";

            case "PREPARADO":
                return "estado-preparado";

            case "DESPACHADO":
                return "estado-despachado";

            case "ENTREGADO":
                return "estado-entregado";

            case "CANCELADO":
                return "estado-cancelado";

            default:
                return "";
        }
    }

    function puedeAsignarRepartidor(pedido) {

        if (!esAdmin || !pedido) {
            return false;
        }

        return [
            "PENDIENTE",
            "APROBADO",
            "EN PRODUCCION",
            "PREPARADO"
        ].includes(estadoDe(pedido));
    }

    // ========================================================
    // PETICIONES AL BACKEND
    // ========================================================

    async function peticionAPI(url, opciones = {}) {

        let respuesta;

        try {

            respuesta = await fetch(url, {

                ...opciones,

                credentials: "include",

                headers: {

                    Accept: "application/json",

                    ...(opciones.body !== undefined
                        ? {
                            "Content-Type":
                                "application/json"
                        }
                        : {}),

                    ...(opciones.headers || {})
                }
            });

        } catch (error) {

            throw new Error(
                "No se pudo conectar con el servidor. " +
                "Verifica que Tomcat esté disponible."
            );
        }

        const texto = await respuesta.text();

        let datos = {};

        if (texto.trim()) {

            try {
                datos = JSON.parse(texto);
            } catch (error) {

                throw new Error(
                    "El servidor no devolvió JSON válido."
                );
            }
        }

        if (!respuesta.ok) {

            if (respuesta.status === 401) {

                throw new Error(
                    "Tu sesión ha expirado. " +
                    "Inicia sesión nuevamente."
                );
            }

            throw new Error(
                datos?.mensaje ||
                datos?.error ||
                "Error HTTP " + respuesta.status
            );
        }

        if (
            datos &&
            typeof datos === "object" &&
            !Array.isArray(datos)
        ) {

            if (
                String(datos.estado || "").toUpperCase()
                === "ERROR"
            ) {

                throw new Error(
                    datos.mensaje ||
                    "La operación no se pudo completar."
                );
            }

            if (
                datos.idSalida !== undefined &&
                datos.idSalida !== null &&
                Number(datos.idSalida) <= 0
            ) {

                throw new Error(
                    datos.mensaje ||
                    "Oracle rechazó la operación."
                );
            }
        }

        return datos;
    }

    // ========================================================
    // CONSULTAR DISPONIBILIDAD DE INVENTARIO
    // ========================================================

    async function consultarDisponibilidad(idPedido) {

        const datos = await peticionAPI(
            API_PEDIDOS + "/" +
            idPedido + "/disponibilidad"
        );

        const lista = Array.isArray(datos.productos)
            ? datos.productos
            : [];

        const disponible =
            datos.disponible === true &&
            lista.length > 0;

        const resultado = {

            disponible,

            requiereProduccion: !disponible,

            productos: lista,

            cantidadTotalFaltante: Number(
                datos.cantidadTotalFaltante || 0
            )
        };

        disponibilidadPedidos.set(
            idPedido,
            resultado
        );

        return resultado;
    }

    async function cargarDisponibilidades() {

        disponibilidadPedidos.clear();

        if (!esAdmin) return;

        const pendientesRevision = pedidos.filter(
            pedido => {

                const estado = estadoDe(pedido);

                return (
                    estado === "APROBADO" ||
                    estado === "EN PRODUCCION"
                );
            }
        );

        const TAMANO_LOTE = 5;

        for (
            let inicio = 0;
            inicio < pendientesRevision.length;
            inicio += TAMANO_LOTE
        ) {

            const lote = pendientesRevision.slice(
                inicio,
                inicio + TAMANO_LOTE
            );

            await Promise.all(

                lote.map(async pedido => {

                    const id = idPedidoDe(pedido);

                    try {

                        await consultarDisponibilidad(id);

                    } catch (error) {

                        console.error(
                            "Error consultando disponibilidad " +
                            "del pedido #" + id,
                            error
                        );

                        disponibilidadPedidos.set(id, {

                            error: true,
                            disponible: false,
                            requiereProduccion: false,
                            productos: []
                        });
                    }
                })
            );
        }
    }

    // ========================================================
    // PRODUCTOS TERMINADOS
    // ========================================================

    function normalizarProducto(producto) {

        return {

            idProducto: Number(
                campo(
                    producto,
                    "idProducto",
                    "ID_PRODUCTO"
                )
            ),

            nombreProducto: String(
                campo(
                    producto,
                    "nombreProducto",
                    "NOMBRE_PRODUCTO"
                ) || ""
            ),

            tipoProducto: String(
                campo(
                    producto,
                    "tipoProducto",
                    "TIPO_PRODUCTO"
                ) || ""
            ).toUpperCase().trim(),

            precio: Number(
                campo(
                    producto,
                    "precioP",
                    "PRECIO_P",
                    "precio"
                ) || 0
            ),

            activo: campo(
                producto,
                "activo",
                "ACTIVO"
            ),

            aprobado: campo(
                producto,
                "aprobado",
                "APROBADO"
            )
        };
    }

    async function cargarProductos() {

        try {

            const datos = await peticionAPI(
                API_PRODUCTOS + "/todos"
            );

            productos = normalizarLista(
                datos,
                "productos"
            )
                .map(normalizarProducto)
                .filter(producto => (

                    producto.idProducto > 0 &&

                    producto.tipoProducto ===
                        "PRODUCTO_TERMINADO" &&

                    valorActivo(producto.activo) &&

                    valorActivo(producto.aprobado)
                ));

        } catch (error) {

            productos = [];
            mostrarError(error);
        }

        llenarSelectProductos("productoPedido");

        llenarSelectProductos(
            "detalleProductoNuevo"
        );
    }

    function llenarSelectProductos(idSelect) {

        const select = $(idSelect);

        if (!select) return;

        select.innerHTML =
            '<option value="">Seleccione un producto</option>';

        productos.forEach(producto => {

            const opcion =
                document.createElement("option");

            opcion.value = producto.idProducto;

            opcion.textContent =
                producto.nombreProducto +
                " - " +
                dinero(producto.precio);

            select.appendChild(opcion);
        });
    }

    // ========================================================
    // SUCURSALES
    // ========================================================

    function normalizarSucursal(sucursal) {

        return {

            idSucursal: Number(
                campo(
                    sucursal,
                    "idSucursal",
                    "ID_SUCURSAL"
                )
            ),

            nombreSucursal: String(
                campo(
                    sucursal,
                    "nombreSucursal",
                    "NOMBRE_SUCURSAL"
                ) || ""
            )
        };
    }

    async function cargarSucursales() {

        try {

            const datos = await peticionAPI(
                API_SUCURSALES
            );

            sucursales = normalizarLista(
                datos,
                "sucursales"
            )
                .map(normalizarSucursal)
                .filter(
                    sucursal => sucursal.idSucursal > 0
                );

        } catch (error) {

            console.error(error);

            sucursales = [];

            if (idSucursalActual > 0) {

                sucursales.push({

                    idSucursal: idSucursalActual,

                    nombreSucursal:
                        "Sucursal #" + idSucursalActual
                });
            }

            mostrarMensaje(
                "mensajePedidos",
                "No se pudo cargar el catálogo de sucursales.",
                "error"
            );
        }

        llenarSelectSucursales();
    }

    function llenarSelectSucursales() {

        filtroSucursal.innerHTML =
            '<option value="">Todas las sucursales</option>';

        pedidoSucursal.innerHTML =
            '<option value="">Seleccione una sucursal</option>';

        sucursales.forEach(sucursal => {

            const opcionFiltro =
                document.createElement("option");

            opcionFiltro.value =
                sucursal.idSucursal;

            opcionFiltro.textContent =
                sucursal.nombreSucursal;

            filtroSucursal.appendChild(
                opcionFiltro
            );

            const opcionPedido =
                document.createElement("option");

            opcionPedido.value =
                sucursal.idSucursal;

            opcionPedido.textContent =
                sucursal.nombreSucursal;

            pedidoSucursal.appendChild(
                opcionPedido
            );
        });

        if (esSucursal) {

            filtroSucursal.value =
                String(idSucursalActual);

            filtroSucursal.disabled = true;

            pedidoSucursal.value =
                String(idSucursalActual);

            pedidoSucursal.disabled = true;
        }
    }

    function nombreSucursalDe(idSucursal) {

        const sucursal = sucursales.find(
            item =>
                item.idSucursal === Number(idSucursal)
        );

        return sucursal
            ? sucursal.nombreSucursal
            : "Sucursal #" + idSucursal;
    }

    async function mostrarSucursalUsuario() {

        if (
            !Number.isInteger(idSucursalActual) ||
            idSucursalActual <= 0
        ) {

            sucursalUsuario.textContent =
                "Sin sucursal asignada";

            return;
        }

        const sucursal = sucursales.find(
            item =>
                item.idSucursal === idSucursalActual
        );

        if (sucursal) {

            sucursalUsuario.textContent =
                "Sucursal: " + sucursal.nombreSucursal;

            return;
        }

        try {

            const datos = await peticionAPI(
                API_SUCURSALES + "/" +
                idSucursalActual
            );

            const encontrada =
                datos?.sucursal || datos;

            sucursalUsuario.textContent =
                "Sucursal: " +
                (
                    encontrada.nombreSucursal ||
                    "#" + idSucursalActual
                );

        } catch (error) {

            sucursalUsuario.textContent =
                "Sucursal #" + idSucursalActual;
        }
    }

    // ========================================================
    // REPARTIDORES
    // GET /api/usuarios
    // ========================================================

    function normalizarRepartidor(usuario) {

        return {

            idUsuario: Number(
                campo(
                    usuario,
                    "idUsuario",
                    "ID_USUARIO"
                )
            ),

            nombreUsuario: String(
                campo(
                    usuario,
                    "nombreUsuario",
                    "NOMBRE_USUARIO"
                ) || ""
            ),

            rol: String(
                campo(
                    usuario,
                    "rol",
                    "ROL"
                ) || ""
            ).toUpperCase().trim(),

            activo: campo(
                usuario,
                "activo",
                "ACTIVO"
            )
        };
    }

    async function cargarRepartidores() {

        if (!esAdmin) {
            return;
        }

        repartidores = [];
        errorCatalogoRepartidores = "";

        try {

            const datos = await peticionAPI(
                API_USUARIOS
            );

            const usuarios = normalizarLista(
                datos,
                "usuarios"
            );

            repartidores = usuarios
                .map(normalizarRepartidor)
                .filter(usuario => (

                    usuario.idUsuario > 0 &&

                    usuario.rol === "REPARTIDOR" &&

                    (
                        usuario.activo === undefined ||
                        valorActivo(usuario.activo)
                    )
                ))
                .sort((a, b) =>
                    a.nombreUsuario.localeCompare(
                        b.nombreUsuario,
                        "es"
                    )
                );

        } catch (error) {

            console.error(
                "Error cargando repartidores:",
                error
            );

            errorCatalogoRepartidores =
                error.message;
        }
    }

    function actualizarPanelRepartidor(pedido) {

        if (!pedido) {
            panelAsignarRepartidor.hidden = true;
            return;
        }

        const idAsignado =
            idRepartidorDe(pedido);

        const nombre =
            nombreRepartidorDe(pedido);

        detalleRepartidor.textContent =
            nombre;

        detalleRepartidor.className =
            idAsignado
                ? "repartidor-asignado"
                : "repartidor-sin-asignar";

        const puedeAsignar =
            puedeAsignarRepartidor(pedido);

        panelAsignarRepartidor.hidden =
            !puedeAsignar;

        if (!puedeAsignar) {
            return;
        }

        selectRepartidor.innerHTML =
            '<option value="">Seleccione un repartidor</option>';

        repartidores.forEach(repartidor => {

            const opcion =
                document.createElement("option");

            opcion.value =
                repartidor.idUsuario;

            opcion.textContent =
                repartidor.nombreUsuario;

            selectRepartidor.appendChild(
                opcion
            );
        });

        if (idAsignado) {

            const existe = repartidores.some(
                repartidor =>
                    repartidor.idUsuario === idAsignado
            );

            if (!existe) {

                const opcion =
                    document.createElement("option");

                opcion.value = idAsignado;

                opcion.textContent =
                    nombre + " (asignado actualmente)";

                opcion.disabled = true;

                selectRepartidor.appendChild(
                    opcion
                );
            }

            selectRepartidor.value =
                String(idAsignado);
        }

        btnGuardarRepartidor.disabled =
            repartidores.length === 0 ||
            guardandoRepartidor;

        if (errorCatalogoRepartidores) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "No se pudieron cargar los repartidores: " +
                errorCatalogoRepartidores,
                "error"
            );

        } else if (repartidores.length === 0) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "No hay repartidores activos disponibles.",
                "error"
            );

        } else {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                ""
            );
        }
    }

    // ========================================================
    // ASIGNAR REPARTIDOR AL PEDIDO
    // PUT /api/pedidos/{id}/asignar-repartidor
    // ========================================================

    async function guardarAsignacionRepartidor() {

        if (
            !esAdmin ||
            guardandoRepartidor ||
            !pedidoDetalleActual
        ) {
            return;
        }

        if (!puedeAsignarRepartidor(
            pedidoDetalleActual
        )) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "No se puede cambiar el repartidor " +
                "después del despacho.",
                "error"
            );

            return;
        }

        const idPedido =
            idPedidoDe(pedidoDetalleActual);

        const idRepartidor =
            Number(selectRepartidor.value);

        if (
            !Number.isInteger(idRepartidor) ||
            idRepartidor <= 0
        ) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "Selecciona un repartidor.",
                "error"
            );

            return;
        }

        const repartidor = repartidores.find(
            item =>
                item.idUsuario === idRepartidor
        );

        if (!repartidor) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "El repartidor seleccionado no está activo.",
                "error"
            );

            return;
        }

        if (
            idRepartidorDe(pedidoDetalleActual) ===
            idRepartidor
        ) {

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                "Este repartidor ya está asignado.",
                "error"
            );

            return;
        }

        if (!window.confirm(
            "¿Deseas asignar a " +
            repartidor.nombreUsuario +
            " al pedido #" +
            idPedido +
            "?"
        )) {
            return;
        }

        guardandoRepartidor = true;

        btnGuardarRepartidor.disabled = true;

        btnGuardarRepartidor.textContent =
            "Guardando...";

        try {

            const resultado = await peticionAPI(
                API_PEDIDOS +
                "/" +
                idPedido +
                "/asignar-repartidor",
                {

                    method: "PUT",

                    body: JSON.stringify({
                        idRepartidor: idRepartidor
                    })
                }
            );

            await cargarPedidos();

            await abrirDetallePedido(idPedido);

            mostrarMensaje(
                "mensajeAsignarRepartidor",
                resultado?.mensaje ||
                "Repartidor asignado correctamente.",
                "exito"
            );

            mostrarMensaje(
                "mensajePedidos",
                "Repartidor actualizado en el pedido #" +
                idPedido + ".",
                "exito"
            );

        } catch (error) {

            mostrarError(
                error,
                "mensajeAsignarRepartidor"
            );

        } finally {

            guardandoRepartidor = false;

            btnGuardarRepartidor.disabled =
                repartidores.length === 0;

            btnGuardarRepartidor.textContent =
                "Guardar asignación";
        }
    }

    // ========================================================
    // CONSULTAR PEDIDOS
    // ========================================================

    async function cargarPedidos() {

        tablaPedidos.innerHTML = `
            <tr>
                <td colspan="9" class="sin-datos">
                    Cargando pedidos y verificando inventario...
                </td>
            </tr>
        `;

        btnActualizar.disabled = true;

        try {

            let url = API_PEDIDOS;

            if (esSucursal) {

                if (
                    !Number.isInteger(idSucursalActual) ||
                    idSucursalActual <= 0
                ) {

                    throw new Error(
                        "Tu usuario no tiene una sucursal asignada."
                    );
                }

                url =
                    API_PEDIDOS +
                    "/sucursal/" +
                    idSucursalActual;
            }

            const datos = await peticionAPI(url);

            pedidos = normalizarLista(
                datos,
                "pedidos"
            );

            if (esSucursal) {

                pedidos = pedidos.filter(
                    pedido =>
                        idSucursalDe(pedido) ===
                        idSucursalActual
                );
            }

            await cargarDisponibilidades();

            mostrarPedidos();

        } catch (error) {

            pedidos = [];

            disponibilidadPedidos.clear();

            totalPedidos.textContent =
                "0 pedidos";

            tablaPedidos.innerHTML = `
                <tr>
                    <td colspan="9" class="sin-datos">
                        No se pudieron cargar los pedidos.
                    </td>
                </tr>
            `;

            mostrarError(error);

        } finally {

            btnActualizar.disabled = false;
        }
    }

    // ========================================================
    // MOSTRAR PEDIDOS Y FILTROS
    // ========================================================

    function mostrarPedidos() {

        const texto =
            buscarPedido.value.trim().toLowerCase();

        const estadoSeleccionado =
            filtroEstado.value;

        const sucursalSeleccionada =
            filtroSucursal.value;

        const filtrados = pedidos.filter(pedido => {

            const id = idPedidoDe(pedido);

            const idSucursal =
                idSucursalDe(pedido);

            const nombreSucursal = String(
                campo(
                    pedido,
                    "nombreSucursal",
                    "NOMBRE_SUCURSAL"
                ) || nombreSucursalDe(idSucursal)
            );

            const nombreSolicitante = String(
                campo(
                    pedido,
                    "nombreUsuario",
                    "NOMBRE_USUARIO"
                ) || ""
            );

            const nombreRepartidor =
                nombreRepartidorDe(pedido);

            const textoPedido = (
                id + " " +
                nombreSucursal + " " +
                nombreSolicitante + " " +
                nombreRepartidor
            ).toLowerCase();

            const coincideBusqueda =
                textoPedido.includes(texto);

            const coincideEstado =
                !estadoSeleccionado ||
                estadoDe(pedido) ===
                    estadoSeleccionado;

            const coincideSucursal =
                !sucursalSeleccionada ||
                idSucursal ===
                    Number(sucursalSeleccionada);

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincideSucursal
            );
        });

        totalPedidos.textContent =
            filtrados.length + " pedidos";

        if (filtrados.length === 0) {

            tablaPedidos.innerHTML = `
                <tr>
                    <td colspan="9" class="sin-datos">
                        No se encontraron pedidos.
                    </td>
                </tr>
            `;

            return;
        }

        tablaPedidos.innerHTML =
            filtrados.map(pedido => {

                const id = idPedidoDe(pedido);

                const estado = estadoDe(pedido);

                const nombreSucursal = campo(
                    pedido,
                    "nombreSucursal",
                    "NOMBRE_SUCURSAL"
                ) || nombreSucursalDe(
                    idSucursalDe(pedido)
                );

                const nombreSolicitante = campo(
                    pedido,
                    "nombreUsuario",
                    "NOMBRE_USUARIO"
                ) || "—";

                const fecha = campo(
                    pedido,
                    "fecha",
                    "FECHA"
                );

                const total = campo(
                    pedido,
                    "total",
                    "TOTAL"
                );

                const observaciones = campo(
                    pedido,
                    "observaciones",
                    "OBSERVACIONES"
                ) || "—";

                const nombreRepartidor =
                    nombreRepartidorDe(pedido);

                const tieneRepartidor =
                    !!idRepartidorDe(pedido);

                return `
                    <tr>

                        <td>${id}</td>

                        <td>
                            ${escaparHTML(nombreSucursal)}
                        </td>

                        <td>
                            ${escaparHTML(nombreSolicitante)}
                        </td>

                        <td>
                            ${escaparHTML(
                                formatearFecha(fecha)
                            )}
                        </td>

                        <td>
                            <span class="estado ${claseEstado(estado)}">
                                ${escaparHTML(estado)}
                            </span>
                        </td>

                        <td>
                            <span class="${
                                tieneRepartidor
                                    ? "repartidor-asignado"
                                    : "repartidor-sin-asignar"
                            }">
                                ${escaparHTML(nombreRepartidor)}
                            </span>
                        </td>

                        <td>
                            ${dinero(total)}
                        </td>

                        <td class="texto-observaciones">
                            ${escaparHTML(observaciones)}
                        </td>

                        <td>

                            <div class="acciones-tabla">

                                <button
                                    type="button"
                                    class="btn-accion"
                                    data-accion="detalle"
                                    data-id="${id}">
                                    Ver detalle
                                </button>

                                ${generarBotonesEstado(pedido)}

                            </div>

                        </td>

                    </tr>
                `;
            }).join("");
    }

    // ========================================================
    // BOTONES SEGÚN ESTADO
    // ========================================================

    function botonAccion(
        id,
        accion,
        texto,
        clase = ""
    ) {

        return `
            <button
                type="button"
                class="btn-accion ${clase}"
                data-accion="${accion}"
                data-id="${id}">
                ${texto}
            </button>
        `;
    }

    function textoInformativo(texto) {

        return `
            <span class="texto-estado-accion">
                ${escaparHTML(texto)}
            </span>
        `;
    }

    function generarBotonesEstado(pedido) {

        if (!esAdmin) {
            return "";
        }

        const id = idPedidoDe(pedido);

        const estado = estadoDe(pedido);

        let botones = "";

        // ASIGNACIÓN ANTES DEL DESPACHO

        if (puedeAsignarRepartidor(pedido)) {

            botones += botonAccion(
                id,
                "asignar-repartidor",
                idRepartidorDe(pedido)
                    ? "Cambiar repartidor"
                    : "Asignar repartidor"
            );
        }

        // PENDIENTE

        if (estado === "PENDIENTE") {

            botones += botonAccion(
                id,
                "aprobar",
                "Aprobar"
            );

            botones += botonAccion(
                id,
                "cancelar",
                "Cancelar",
                "peligro"
            );

            return botones;
        }

        // APROBADO

        if (estado === "APROBADO") {

            const disponibilidad =
                disponibilidadPedidos.get(id);

            if (
                !disponibilidad ||
                disponibilidad.error
            ) {

                botones += textoInformativo(
                    "No se pudo verificar el inventario"
                );

            } else if (disponibilidad.disponible) {

                botones += botonAccion(
                    id,
                    "preparar",
                    "Preparar"
                );

            } else {

                botones += botonAccion(
                    id,
                    "iniciar-produccion",
                    "Iniciar producción"
                );
            }

            botones += botonAccion(
                id,
                "cancelar",
                "Cancelar",
                "peligro"
            );

            return botones;
        }

        // EN PRODUCCIÓN

        if (estado === "EN PRODUCCION") {

            const disponibilidad =
                disponibilidadPedidos.get(id);

            if (
                !disponibilidad ||
                disponibilidad.error
            ) {

                botones += textoInformativo(
                    "No se pudo verificar el inventario"
                );

            } else if (disponibilidad.disponible) {

                botones += botonAccion(
                    id,
                    "preparar",
                    "Preparar"
                );

            } else {

                botones += textoInformativo(
                    "Esperando producción"
                );
            }

            return botones;
        }

        // PREPARADO

        if (estado === "PREPARADO") {

            if (idRepartidorDe(pedido)) {

                botones += botonAccion(
                    id,
                    "despachar",
                    "Despachar"
                );

            } else {

                botones += textoInformativo(
                    "Asigna un repartidor para despachar"
                );
            }

            return botones;
        }

        // DESPACHADO

        if (estado === "DESPACHADO") {

            botones += botonAccion(
                id,
                "entregar",
                "Confirmar entrega"
            );
        }

        return botones;
    }

    // ========================================================
    // ABRIR MODAL DE NUEVO PEDIDO
    // ========================================================

    function abrirModalPedido() {

        if (!esAdmin && !esSucursal) {

            mostrarMensaje(
                "mensajePedidos",
                "No tienes permisos para crear pedidos.",
                "error"
            );

            return;
        }

        if (
            esSucursal &&
            idSucursalActual <= 0
        ) {

            mostrarMensaje(
                "mensajePedidos",
                "No tienes una sucursal asignada.",
                "error"
            );

            return;
        }

        formPedido.reset();

        productosNuevoPedido = [];

        pedidoIdUsuario.value =
            idUsuarioActual;

        pedidoUsuario.value =
            usuarioActual.nombreUsuario ||
            usuarioActual.usuario ||
            "Usuario";

        if (esSucursal) {

            pedidoSucursal.value =
                String(idSucursalActual);

            pedidoSucursal.disabled = true;

            if ($("ayudaSucursal")) {

                $("ayudaSucursal").textContent =
                    "El pedido será registrado para tu sucursal.";
            }

        } else {

            pedidoSucursal.disabled = false;

            pedidoSucursal.value = "";

            if ($("ayudaSucursal")) {

                $("ayudaSucursal").textContent =
                    "Selecciona la sucursal solicitante.";
            }
        }

        mostrarProductosNuevoPedido();

        mostrarMensaje(
            "mensajeFormularioPedido",
            ""
        );

        modalPedido.hidden = false;

        pedidoObservaciones.focus();
    }

    function cerrarModalPedido() {

        if (guardandoPedido) return;

        modalPedido.hidden = true;

        formPedido.reset();

        productosNuevoPedido = [];
    }

    // ========================================================
    // AGREGAR PRODUCTOS A PEDIDO NUEVO
    // ========================================================

    function agregarProductoNuevoPedido() {

        if (guardandoPedido) return;

        const idProducto =
            Number(productoPedido.value);

        const cantidad =
            Number(cantidadPedido.value);

        if (
            !Number.isInteger(idProducto) ||
            idProducto <= 0
        ) {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "Selecciona un producto.",
                "error"
            );

            return;
        }

        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "La cantidad debe ser un entero mayor que cero.",
                "error"
            );

            return;
        }

        const producto = productos.find(
            item =>
                item.idProducto === idProducto
        );

        if (!producto) {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "El producto no está disponible.",
                "error"
            );

            return;
        }

        const existente =
            productosNuevoPedido.find(
                item =>
                    item.idProducto === idProducto
            );

        if (existente) {

            existente.cantidad += cantidad;

        } else {

            productosNuevoPedido.push({

                idProducto: producto.idProducto,

                nombreProducto:
                    producto.nombreProducto,

                precio: producto.precio,

                cantidad
            });
        }

        productoPedido.value = "";

        cantidadPedido.value = "1";

        mostrarMensaje(
            "mensajeFormularioPedido",
            ""
        );

        mostrarProductosNuevoPedido();
    }

    function mostrarProductosNuevoPedido() {

        if (productosNuevoPedido.length === 0) {

            tablaProductosPedido.innerHTML = `
                <tr>
                    <td colspan="5" class="sin-datos">
                        No hay productos agregados.
                    </td>
                </tr>
            `;

            totalNuevoPedido.textContent =
                dinero(0);

            return;
        }

        tablaProductosPedido.innerHTML =
            productosNuevoPedido.map(
                (producto, indice) => {

                    const subtotal =
                        producto.cantidad *
                        producto.precio;

                    return `
                        <tr>

                            <td>
                                ${escaparHTML(
                                    producto.nombreProducto
                                )}
                            </td>

                            <td>
                                ${producto.cantidad}
                            </td>

                            <td>
                                ${dinero(producto.precio)}
                            </td>

                            <td>
                                ${dinero(subtotal)}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="btn-accion peligro"
                                    data-quitar="${indice}">
                                    Quitar
                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");

        const total =
            productosNuevoPedido.reduce(
                (acumulado, producto) =>

                    acumulado +
                    producto.cantidad *
                    producto.precio,

                0
            );

        totalNuevoPedido.textContent =
            dinero(total);
    }

    // ========================================================
    // GUARDAR PEDIDO NUEVO
    // ========================================================

    async function guardarPedido(evento) {

        evento.preventDefault();

        if (guardandoPedido) return;

        if (!esAdmin && !esSucursal) {
            return;
        }

        const idSucursal = esSucursal
            ? idSucursalActual
            : Number(pedidoSucursal.value);

        const observaciones =
            pedidoObservaciones.value.trim();

        if (
            !Number.isInteger(idSucursal) ||
            idSucursal <= 0
        ) {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "Selecciona una sucursal válida.",
                "error"
            );

            return;
        }

        if (
            productosNuevoPedido.length === 0
        ) {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "Agrega al menos un producto al pedido.",
                "error"
            );

            return;
        }

        if (!window.confirm(
            "¿Deseas registrar el pedido con los productos seleccionados?"
        )) {
            return;
        }

        guardandoPedido = true;

        btnGuardarPedido.disabled = true;

        btnGuardarPedido.textContent =
            "Guardando...";

        let idPedidoCreado = null;

        let detallesGuardados = 0;

        try {

            mostrarMensaje(
                "mensajeFormularioPedido",
                "Registrando encabezado del pedido...",
                "exito"
            );

            // REGISTRAR ENCABEZADO
            // EL REPARTIDOR ES OPCIONAL AL CREAR

            const resultadoPedido =
                await peticionAPI(
                    API_PEDIDOS,
                    {

                        method: "POST",

                        body: JSON.stringify({

                            idSucursal,

                            idUsuario: idUsuarioActual,

                            observaciones
                        })
                    }
                );

            idPedidoCreado = Number(
                campo(
                    resultadoPedido,
                    "idSalida",
                    "idPedido"
                )
            );

            if (
                !Number.isInteger(idPedidoCreado) ||
                idPedidoCreado <= 0
            ) {

                throw new Error(
                    "No se recibió el ID del pedido creado."
                );
            }

            // REGISTRAR PRODUCTOS

            for (
                const producto of productosNuevoPedido
            ) {

                mostrarMensaje(
                    "mensajeFormularioPedido",
                    "Guardando producto " +
                    (detallesGuardados + 1) +
                    " de " +
                    productosNuevoPedido.length +
                    "...",
                    "exito"
                );

                await peticionAPI(
                    API_PEDIDOS +
                    "/" +
                    idPedidoCreado +
                    "/detalle",
                    {

                        method: "POST",

                        body: JSON.stringify({

                            idProducto:
                                producto.idProducto,

                            cantidadDp:
                                producto.cantidad
                        })
                    }
                );

                detallesGuardados++;
            }

            modalPedido.hidden = true;

            await cargarPedidos();

            mostrarMensaje(
                "mensajePedidos",
                "Pedido #" +
                idPedidoCreado +
                " registrado correctamente. " +
                "Puedes asignarle un repartidor posteriormente.",
                "exito"
            );

        } catch (error) {

            let mensaje = error.message;

            if (idPedidoCreado) {

                mensaje =
                    "El pedido #" +
                    idPedidoCreado +
                    " fue creado, pero se registraron " +
                    detallesGuardados +
                    " de " +
                    productosNuevoPedido.length +
                    " productos. " +
                    "Revisa el pedido antes de aprobarlo. " +
                    "Detalle: " +
                    error.message;
            }

            mostrarMensaje(
                "mensajeFormularioPedido",
                mensaje,
                "error"
            );

        } finally {

            guardandoPedido = false;

            btnGuardarPedido.disabled = false;

            btnGuardarPedido.textContent =
                "Guardar pedido";
        }
    }

    // ========================================================
    // CONSULTAR DETALLE DE PEDIDO
    // ========================================================

    async function abrirDetallePedido(idPedido) {

        try {

            const [
                datosPedido,
                datosDetalles
            ] = await Promise.all([

                peticionAPI(
                    API_PEDIDOS + "/" + idPedido
                ),

                peticionAPI(
                    API_PEDIDOS +
                    "/" +
                    idPedido +
                    "/detalle"
                )
            ]);

            const pedido =
                datosPedido?.pedido ||
                datosPedido;

            const detalles =
                Array.isArray(datosDetalles)
                    ? datosDetalles
                    : (
                        datosDetalles?.detalles ||
                        []
                    );

            if (
                !pedido ||
                !idPedidoDe(pedido)
            ) {

                throw new Error(
                    "No se encontró el pedido."
                );
            }

            if (
                esSucursal &&
                idSucursalDe(pedido) !==
                    idSucursalActual
            ) {

                throw new Error(
                    "No puedes consultar pedidos de otra sucursal."
                );
            }

            pedidoDetalleActual = pedido;

            $("tituloDetallePedido").textContent =
                "Detalle del pedido #" +
                idPedido;

            $("detalleSucursal").textContent =
                campo(
                    pedido,
                    "nombreSucursal",
                    "NOMBRE_SUCURSAL"
                ) || nombreSucursalDe(
                    idSucursalDe(pedido)
                );

            $("detalleUsuario").textContent =
                campo(
                    pedido,
                    "nombreUsuario",
                    "NOMBRE_USUARIO"
                ) || "—";

            $("detalleFecha").textContent =
                formatearFecha(
                    campo(
                        pedido,
                        "fecha",
                        "FECHA"
                    )
                );

            const estado =
                estadoDe(pedido);

            $("detalleEstado").textContent =
                estado;

            $("detalleEstado").className =
                "estado " +
                claseEstado(estado);

            $("detalleObservaciones").textContent =
                campo(
                    pedido,
                    "observaciones",
                    "OBSERVACIONES"
                ) || "Sin observaciones.";

            // REPARTIDOR

            actualizarPanelRepartidor(pedido);

            // PRODUCTOS

            mostrarDetalleProductos(
                detalles,
                estado
            );

            panelAgregarDetalle.hidden =
                estado !== "PENDIENTE" ||
                (!esAdmin && !esSucursal);

            mostrarMensaje(
                "mensajeDetallePedido",
                ""
            );

            modalDetallePedido.hidden = false;

        } catch (error) {

            mostrarError(error);
        }
    }

    function mostrarDetalleProductos(
        detalles,
        estado
    ) {

        if (detalles.length === 0) {

            tablaDetallePedido.innerHTML = `
                <tr>
                    <td colspan="5" class="sin-datos">
                        El pedido no tiene productos registrados.
                    </td>
                </tr>
            `;

            $("totalDetallePedido").textContent =
                dinero(0);

            return;
        }

        tablaDetallePedido.innerHTML =
            detalles.map(detalle => {

                const idDetalle = Number(
                    campo(
                        detalle,
                        "idDetalle",
                        "ID_DETALLE"
                    )
                );

                const nombreProducto =
                    campo(
                        detalle,
                        "nombreProducto",
                        "NOMBRE_PRODUCTO"
                    ) || "Producto";

                const cantidad = Number(
                    campo(
                        detalle,
                        "cantidadDp",
                        "CANTIDAD_DP"
                    ) || 0
                );

                const precio = Number(
                    campo(
                        detalle,
                        "precioDp",
                        "PRECIO_DP"
                    ) || 0
                );

                const subtotalCampo =
                    campo(
                        detalle,
                        "subtotal",
                        "SUBTOTAL"
                    );

                const subtotal =
                    subtotalCampo == null
                        ? cantidad * precio
                        : Number(subtotalCampo);

                const puedeEliminar =
                    estado === "PENDIENTE" &&
                    (esAdmin || esSucursal) &&
                    idDetalle > 0;

                return `
                    <tr>

                        <td>
                            ${escaparHTML(nombreProducto)}
                        </td>

                        <td>
                            ${cantidad}
                        </td>

                        <td>
                            ${dinero(precio)}
                        </td>

                        <td>
                            ${dinero(subtotal)}
                        </td>

                        <td>

                            ${
                                puedeEliminar
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-accion peligro"
                                            data-eliminar-detalle="${idDetalle}">
                                            Eliminar
                                        </button>
                                    `
                                    : "—"
                            }

                        </td>

                    </tr>
                `;
            }).join("");

        const total = detalles.reduce(
            (acumulado, detalle) => {

                const cantidad = Number(
                    campo(
                        detalle,
                        "cantidadDp",
                        "CANTIDAD_DP"
                    ) || 0
                );

                const precio = Number(
                    campo(
                        detalle,
                        "precioDp",
                        "PRECIO_DP"
                    ) || 0
                );

                const subtotalCampo = campo(
                    detalle,
                    "subtotal",
                    "SUBTOTAL"
                );

                const subtotal =
                    subtotalCampo == null
                        ? cantidad * precio
                        : Number(subtotalCampo);

                return acumulado + subtotal;
            },
            0
        );

        $("totalDetallePedido").textContent =
            dinero(total);
    }

    function cerrarDetallePedido() {

        if (
            operacionDetalleEnCurso ||
            guardandoRepartidor
        ) {
            return;
        }

        modalDetallePedido.hidden = true;

        pedidoDetalleActual = null;
    }

    // ========================================================
    // AGREGAR PRODUCTO A PEDIDO PENDIENTE
    // ========================================================

    async function agregarDetalleExistente() {

        if (
            operacionDetalleEnCurso ||
            !pedidoDetalleActual
        ) {
            return;
        }

        if (
            estadoDe(pedidoDetalleActual) !==
            "PENDIENTE"
        ) {
            return;
        }

        if (!esAdmin && !esSucursal) {
            return;
        }

        const idPedido =
            idPedidoDe(pedidoDetalleActual);

        const idProducto =
            Number(detalleProductoNuevo.value);

        const cantidad =
            Number(detalleCantidadNueva.value);

        if (
            !Number.isInteger(idProducto) ||
            idProducto <= 0 ||
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            mostrarMensaje(
                "mensajeDetallePedido",
                "Selecciona un producto y una cantidad válida.",
                "error"
            );

            return;
        }

        operacionDetalleEnCurso = true;

        btnAgregarDetalleExistente.disabled = true;

        try {

            await peticionAPI(
                API_PEDIDOS +
                "/" +
                idPedido +
                "/detalle",
                {

                    method: "POST",

                    body: JSON.stringify({

                        idProducto,

                        cantidadDp: cantidad
                    })
                }
            );

            await abrirDetallePedido(idPedido);

            await cargarPedidos();

            mostrarMensaje(
                "mensajeDetallePedido",
                "Producto agregado correctamente.",
                "exito"
            );

        } catch (error) {

            mostrarError(
                error,
                "mensajeDetallePedido"
            );

        } finally {

            operacionDetalleEnCurso = false;

            btnAgregarDetalleExistente.disabled = false;
        }
    }

    // ========================================================
    // ELIMINAR PRODUCTO DE PEDIDO PENDIENTE
    // ========================================================

    async function eliminarDetallePedido(idDetalle) {

        if (
            operacionDetalleEnCurso ||
            !pedidoDetalleActual ||
            estadoDe(pedidoDetalleActual) !==
                "PENDIENTE"
        ) {
            return;
        }

        if (!esAdmin && !esSucursal) {
            return;
        }

        if (!window.confirm(
            "¿Deseas eliminar este producto del pedido?"
        )) {
            return;
        }

        const idPedido =
            idPedidoDe(pedidoDetalleActual);

        operacionDetalleEnCurso = true;

        try {

            await peticionAPI(
                API_PEDIDOS +
                "/detalle/" +
                idDetalle,
                {
                    method: "DELETE"
                }
            );

            await abrirDetallePedido(idPedido);

            await cargarPedidos();

            mostrarMensaje(
                "mensajeDetallePedido",
                "Producto eliminado correctamente.",
                "exito"
            );

        } catch (error) {

            mostrarError(
                error,
                "mensajeDetallePedido"
            );

        } finally {

            operacionDetalleEnCurso = false;
        }
    }

    // ========================================================
    // CAMBIAR ESTADO DEL PEDIDO
    // ========================================================

    async function cambiarEstadoPedido(
        idPedido,
        accion
    ) {

        if (
            !esAdmin ||
            operacionEstadoEnCurso
        ) {

            if (!esAdmin) {

                mostrarMensaje(
                    "mensajePedidos",
                    "No tienes permisos para cambiar estados.",
                    "error"
                );
            }

            return;
        }

        const accionesPermitidas = [

            "aprobar",

            "iniciar-produccion",

            "preparar",

            "despachar",

            "entregar",

            "cancelar"
        ];

        if (!accionesPermitidas.includes(accion)) {
            return;
        }

        const pedido = pedidos.find(
            item =>
                idPedidoDe(item) === idPedido
        );

        if (!pedido) {

            mostrarMensaje(
                "mensajePedidos",
                "No se encontró el pedido.",
                "error"
            );

            return;
        }

        const estadoActual =
            estadoDe(pedido);

        // VALIDAR REPARTIDOR ANTES DE DESPACHAR

        if (
            accion === "despachar" &&
            !idRepartidorDe(pedido)
        ) {

            mostrarMensaje(
                "mensajePedidos",
                "Debes asignar un repartidor " +
                "antes de despachar el pedido #" +
                idPedido + ".",
                "error"
            );

            return;
        }

        // VALIDAR DISPONIBILIDAD DE INVENTARIO

        if (
            accion === "iniciar-produccion" ||
            accion === "preparar"
        ) {

            try {

                const disponibilidad =
                    await consultarDisponibilidad(
                        idPedido
                    );

                if (
                    accion === "preparar" &&
                    !disponibilidad.disponible
                ) {

                    mostrarPedidos();

                    mostrarMensaje(
                        "mensajePedidos",
                        "El pedido #" +
                        idPedido +
                        " no puede prepararse porque " +
                        "faltan productos en fábrica.",
                        "error"
                    );

                    return;
                }

                if (
                    accion === "iniciar-produccion" &&
                    disponibilidad.disponible
                ) {

                    mostrarPedidos();

                    mostrarMensaje(
                        "mensajePedidos",
                        "El pedido #" +
                        idPedido +
                        " tiene existencias suficientes. " +
                        "Puedes prepararlo directamente.",
                        "error"
                    );

                    return;
                }

                if (
                    accion === "iniciar-produccion" &&
                    estadoActual !== "APROBADO"
                ) {
                    return;
                }

            } catch (error) {

                mostrarError(error);

                return;
            }
        }

        const textos = {

            aprobar: "aprobar",

            "iniciar-produccion":
                "iniciar producción para",

            preparar: "preparar",

            despachar: "despachar",

            entregar: "confirmar la entrega de",

            cancelar: "cancelar"
        };

        if (!window.confirm(
            "¿Deseas " +
            textos[accion] +
            " el pedido #" +
            idPedido +
            "?"
        )) {
            return;
        }

        operacionEstadoEnCurso = true;

        try {

            const resultado = await peticionAPI(
                API_PEDIDOS +
                "/" +
                idPedido +
                "/" +
                accion,
                {
                    method: "PUT"
                }
            );

            await cargarPedidos();

            mostrarMensaje(
                "mensajePedidos",
                resultado?.mensaje ||
                "Pedido #" +
                idPedido +
                " actualizado correctamente.",
                "exito"
            );

        } catch (error) {

            await cargarPedidos();

            mostrarError(error);

        } finally {

            operacionEstadoEnCurso = false;
        }
    }

    // ========================================================
    // CERRAR SESIÓN
    // ========================================================

    async function cerrarSesion() {

        if (!window.confirm(
            "¿Deseas cerrar sesión?"
        )) {
            return;
        }

        btnCerrarSesion.disabled = true;

        try {

            const respuesta = await fetch(
                API_LOGOUT,
                {

                    method: "POST",

                    credentials: "include"
                }
            );

            if (!respuesta.ok) {

                throw new Error(
                    "No se pudo cerrar sesión."
                );
            }

            sessionStorage.removeItem("usuario");

            window.location.replace("index.html");

        } catch (error) {

            console.error(error);

            alert(
                "No se pudo cerrar la sesión. " +
                "Inténtalo nuevamente."
            );

            btnCerrarSesion.disabled = false;
        }
    }

    // ========================================================
    // EVENTOS DE FILTROS
    // ========================================================

    buscarPedido.addEventListener(
        "input",
        mostrarPedidos
    );

    filtroEstado.addEventListener(
        "change",
        mostrarPedidos
    );

    filtroSucursal.addEventListener(
        "change",
        mostrarPedidos
    );

    btnActualizar.addEventListener(
        "click",
        async function () {

            if (esAdmin) {
                await cargarRepartidores();
            }

            await cargarPedidos();
        }
    );

    // ========================================================
    // EVENTOS DE NUEVO PEDIDO
    // ========================================================

    btnNuevoPedido.addEventListener(
        "click",
        abrirModalPedido
    );

    $("btnCerrarModalPedido").addEventListener(
        "click",
        cerrarModalPedido
    );

    $("btnCancelarPedido").addEventListener(
        "click",
        cerrarModalPedido
    );

    formPedido.addEventListener(
        "submit",
        guardarPedido
    );

    btnAgregarProducto.addEventListener(
        "click",
        agregarProductoNuevoPedido
    );

    tablaProductosPedido.addEventListener(
        "click",
        function (evento) {

            const boton = evento.target.closest(
                "[data-quitar]"
            );

            if (
                !boton ||
                guardandoPedido
            ) {
                return;
            }

            const indice = Number(
                boton.dataset.quitar
            );

            if (
                Number.isInteger(indice) &&
                indice >= 0 &&
                indice < productosNuevoPedido.length
            ) {

                productosNuevoPedido.splice(
                    indice,
                    1
                );

                mostrarProductosNuevoPedido();
            }
        }
    );

    // ========================================================
    // EVENTOS DE TABLA DE PEDIDOS
    // ========================================================

    tablaPedidos.addEventListener(
        "click",
        async function (evento) {

            const boton = evento.target.closest(
                "[data-accion]"
            );

            if (!boton) {
                return;
            }

            const idPedido = Number(
                boton.dataset.id
            );

            const accion =
                boton.dataset.accion;

            if (
                !Number.isInteger(idPedido) ||
                idPedido <= 0
            ) {
                return;
            }

            if (
                accion === "detalle" ||
                accion === "asignar-repartidor"
            ) {

                await abrirDetallePedido(
                    idPedido
                );

                if (
                    accion === "asignar-repartidor" &&
                    !panelAsignarRepartidor.hidden
                ) {

                    selectRepartidor.focus();
                }

            } else {

                await cambiarEstadoPedido(
                    idPedido,
                    accion
                );
            }
        }
    );

    // ========================================================
    // EVENTOS DE ASIGNACIÓN DE REPARTIDOR
    // ========================================================

    btnGuardarRepartidor.addEventListener(
        "click",
        guardarAsignacionRepartidor
    );

    // ========================================================
    // EVENTOS DE DETALLE DE PEDIDO
    // ========================================================

    $("btnCerrarDetallePedido").addEventListener(
        "click",
        cerrarDetallePedido
    );

    $("btnCerrarDetalleInferior").addEventListener(
        "click",
        cerrarDetallePedido
    );

    btnAgregarDetalleExistente.addEventListener(
        "click",
        agregarDetalleExistente
    );

    tablaDetallePedido.addEventListener(
        "click",
        async function (evento) {

            const boton = evento.target.closest(
                "[data-eliminar-detalle]"
            );

            if (!boton) {
                return;
            }

            const idDetalle = Number(
                boton.dataset.eliminarDetalle
            );

            if (
                Number.isInteger(idDetalle) &&
                idDetalle > 0
            ) {

                await eliminarDetallePedido(
                    idDetalle
                );
            }
        }
    );

    // ========================================================
    // CERRAR MODALES AL HACER CLIC FUERA
    // ========================================================

    modalPedido.addEventListener(
        "click",
        function (evento) {

            if (
                evento.target === modalPedido
            ) {

                cerrarModalPedido();
            }
        }
    );

    modalDetallePedido.addEventListener(
        "click",
        function (evento) {

            if (
                evento.target === modalDetallePedido
            ) {

                cerrarDetallePedido();
            }
        }
    );

    // ========================================================
    // CERRAR MODALES CON ESC
    // ========================================================

    document.addEventListener(
        "keydown",
        function (evento) {

            if (evento.key !== "Escape") {
                return;
            }

            if (!modalDetallePedido.hidden) {

                cerrarDetallePedido();

            } else if (!modalPedido.hidden) {

                cerrarModalPedido();
            }
        }
    );

    // ========================================================
    // PERMISOS DE INTERFAZ
    // ========================================================

    if (esSucursal) {

        filtroSucursal.disabled = true;
    }

    if (!esAdmin && !esSucursal) {

        btnNuevoPedido.hidden = true;

        mostrarMensaje(
            "mensajePedidos",
            "Tu rol no tiene permisos para gestionar pedidos.",
            "error"
        );

        return;
    }

    // ========================================================
    // CARGA INICIAL
    // ========================================================

    await Promise.all([

        cargarProductos(),

        cargarSucursales(),

        cargarRepartidores()
    ]);

    await mostrarSucursalUsuario();

    await cargarPedidos();

});



