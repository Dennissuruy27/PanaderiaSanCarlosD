
document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACIÓN DE API
    // ============================================

    const API_INCIDENCIAS =
        "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/incidencias";

    const API_SUCURSALES =
        "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/sucursales";

    const API_LOGOUT =
        "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios/logout";


    // ============================================
    // ELEMENTOS DEL HTML
    // ============================================

    const tabla = document.getElementById("tablaIncidencias");
    const contador = document.getElementById("totalIncidencias");
    const buscar = document.getElementById("buscarIncidencia");
    const filtroEstado = document.getElementById("filtroEstado");
    const filtroTipo = document.getElementById("filtroTipo");
    const mensaje = document.getElementById("mensajeIncidencias");
    const btnActualizar = document.getElementById("btnActualizar");

    const nombreUsuario = document.getElementById("nombreUsuario");
    const rolUsuario = document.getElementById("rolUsuario");
    const sucursalUsuario = document.getElementById("sucursalUsuario");
    const btnCerrarSesion = document.getElementById("btnCerrarSesion");

    const modal = document.getElementById("modalIncidencia");
    const btnCerrarModal = document.getElementById("btnCerrarModal");
    const btnCancelarModal = document.getElementById("btnCancelarModal");

    let incidencias = [];
    let usuarioActual = null;
    let actualizando = false;


    // ============================================
    // VERIFICAR SESIÓN
    // ============================================

    const usuarioGuardado = sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
        window.location.replace("index.html");
        return;
    }

    try {
        usuarioActual = JSON.parse(usuarioGuardado);

        if (!usuarioActual || typeof usuarioActual !== "object") {
            throw new Error("Sesión inválida");
        }

    } catch (error) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return;
    }

    const rolActual = String(usuarioActual.rol || "")
        .trim()
        .toUpperCase();

    if (rolActual !== "ADMIN") {
        window.alert(
            "Solo los administradores pueden acceder a Gestión de incidencias."
        );
        window.location.replace("dashboard.html");
        return;
    }


    // ============================================
    // MOSTRAR INFORMACIÓN DEL USUARIO
    // ============================================

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


    // ============================================
    // CONSULTAR SUCURSAL
    // ============================================

    async function mostrarSucursalUsuario() {

        const idSucursal = usuarioActual.idSucursal;

        if (
            idSucursal === null ||
            idSucursal === undefined ||
            String(idSucursal).trim() === ""
        ) {
            sucursalUsuario.textContent = "Sin sucursal asignada";
            return;
        }

        const id = Number(idSucursal);

        if (!Number.isInteger(id) || id <= 0) {
            sucursalUsuario.textContent = "Sucursal no disponible";
            return;
        }

        sucursalUsuario.textContent = "Cargando sucursal...";

        try {
            const respuesta = await fetch(
                API_SUCURSALES + "/" + encodeURIComponent(id),
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (!respuesta.ok) {
                throw new Error("No se pudo consultar la sucursal");
            }

            const datos = await respuesta.json();

            if (!datos.sucursal || !datos.sucursal.nombreSucursal) {
                throw new Error("Sucursal no encontrada");
            }

            sucursalUsuario.textContent =
                "Sucursal: " + datos.sucursal.nombreSucursal;

        } catch (error) {
            console.error("Error al consultar sucursal:", error);
            sucursalUsuario.textContent = "Sucursal #" + id;
        }
    }


    // ============================================
    // CERRAR SESIÓN
    // ============================================

    btnCerrarSesion.addEventListener("click", async function () {

        btnCerrarSesion.disabled = true;

        try {
            const respuesta = await fetch(API_LOGOUT, {
                method: "POST",
                credentials: "include"
            });

            if (!respuesta.ok) {
                throw new Error("No se pudo cerrar sesión");
            }

            sessionStorage.removeItem("usuario");
            window.location.replace("index.html");

        } catch (error) {
            console.error("Error al cerrar sesión:", error);

            alert("No se pudo cerrar la sesión. Inténtalo nuevamente.");
            btnCerrarSesion.disabled = false;
        }
    });


    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================

    function campo(objeto, ...nombres) {

        for (const nombre of nombres) {
            if (
                objeto &&
                objeto[nombre] !== undefined &&
                objeto[nombre] !== null
            ) {
                return objeto[nombre];
            }
        }

        return "";
    }

    function mostrarMensaje(texto, tipo = "exito") {
        mensaje.textContent = texto;
        mensaje.className = "mensaje " + tipo;
    }

    function limpiarMensaje() {
        mensaje.textContent = "";
        mensaje.className = "mensaje";
    }

    function formatoEstado(estado) {

        const nombres = {
            PENDIENTE: "Pendiente",
            EN_REVISION: "En revisión",
            RESUELTA: "Resuelta"
        };

        return nombres[String(estado).toUpperCase()] || estado || "—";
    }

    function formatoTipo(tipo) {
        return String(tipo || "—")
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, letra => letra.toUpperCase());
    }

    function formatoFecha(valor) {

        if (!valor) return "—";

        let fecha;

        if (typeof valor === "object") {

            const segundos =
                valor.seconds ??
                valor._seconds ??
                valor.epochSecond;

            if (segundos !== undefined) {
                fecha = new Date(Number(segundos) * 1000);
            } else {
                return "—";
            }

        } else if (typeof valor === "number") {

            fecha = new Date(
                valor < 100000000000 ? valor * 1000 : valor
            );

        } else {
            fecha = new Date(valor);
        }

        if (Number.isNaN(fecha.getTime())) {
            return "—";
        }

        return fecha.toLocaleString("es-GT", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function obtenerId(incidencia) {
        return String(
            campo(incidencia, "idIncidencia", "id", "documentId")
        );
    }

    function obtenerEstado(incidencia) {
        return String(campo(incidencia, "estado"))
            .trim()
            .toUpperCase();
    }

    async function leerRespuesta(respuesta) {

        const texto = await respuesta.text();

        if (!texto.trim()) return {};

        try {
            return JSON.parse(texto);
        } catch (error) {
            throw new Error("El servidor no devolvió JSON válido");
        }
    }

    function crearCelda(fila, valor, clase = "") {

        const celda = document.createElement("td");

        celda.textContent =
            valor === null ||
            valor === undefined ||
            valor === ""
                ? "—"
                : String(valor);

        if (clase) {
            celda.className = clase;
        }

        fila.appendChild(celda);
        return celda;
    }


    // ============================================
    // CARGAR INCIDENCIAS DESDE FIREBASE
    // ============================================

    async function cargarIncidencias() {

        btnActualizar.disabled = true;

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="sin-datos">
                    Cargando incidencias...
                </td>
            </tr>
        `;

        limpiarMensaje();

        try {
            const respuesta = await fetch(
                API_INCIDENCIAS + "/listar",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );

            const datos = await leerRespuesta(respuesta);

            if (respuesta.status === 401) {
                throw new Error(
                    "La sesión del servidor ha expirado. Inicia sesión nuevamente."
                );
            }

            if (respuesta.status === 403) {
                throw new Error(
                    "No tienes permisos para consultar las incidencias."
                );
            }

            if (!respuesta.ok || datos.estado === "ERROR") {
                throw new Error(
                    datos.mensaje || "No se pudieron consultar las incidencias."
                );
            }

            // Se aceptan las estructuras habituales de respuesta:
            // un arreglo directo o un objeto con la colección.

            if (Array.isArray(datos)) {
                incidencias = datos;
            } else if (Array.isArray(datos.incidencias)) {
                incidencias = datos.incidencias;
            } else if (Array.isArray(datos.registros)) {
                incidencias = datos.registros;
            } else if (Array.isArray(datos.data)) {
                incidencias = datos.data;
            } else {
                throw new Error(
                    "Formato de respuesta no reconocido. Revisa el JSON de /api/incidencias/listar."
                );
            }

            actualizarFiltroTipos();
            mostrarIncidencias();

            return true;

        } catch (error) {
            console.error("Error al cargar incidencias:", error);

            incidencias = [];
            contador.textContent = "0 incidencias";

            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se pudieron cargar las incidencias.
                    </td>
                </tr>
            `;

            mostrarMensaje(error.message, "error");
            return false;

        } finally {
            btnActualizar.disabled = false;
        }
    }


    // ============================================
    // ACTUALIZAR FILTRO DE TIPOS
    // ============================================

    function actualizarFiltroTipos() {

        const seleccionado = filtroTipo.value;

        const tipos = [...new Set(
            incidencias
                .map(incidencia =>
                    String(campo(incidencia, "tipoIncidencia", "tipo"))
                )
                .filter(tipo => tipo.trim() !== "")
        )].sort();

        filtroTipo.innerHTML = "";

        const opcionTodos = document.createElement("option");
        opcionTodos.value = "TODOS";
        opcionTodos.textContent = "Todos los tipos";
        filtroTipo.appendChild(opcionTodos);

        tipos.forEach(tipo => {

            const opcion = document.createElement("option");
            opcion.value = tipo;
            opcion.textContent = formatoTipo(tipo);

            filtroTipo.appendChild(opcion);
        });

        filtroTipo.value =
            tipos.includes(seleccionado) ? seleccionado : "TODOS";
    }


    // ============================================
    // MOSTRAR INCIDENCIAS Y FILTROS
    // ============================================

    function mostrarIncidencias() {

        const texto = buscar.value.trim().toLowerCase();
        const estadoSeleccionado = filtroEstado.value;
        const tipoSeleccionado = filtroTipo.value;

        const filtradas = incidencias.filter(incidencia => {

            const id = obtenerId(incidencia);

            const pedido = String(
                campo(incidencia, "idPedido")
            );

            const repartidor = String(
                campo(incidencia, "idRepartidor")
            );

            const tipo = String(
                campo(incidencia, "tipoIncidencia", "tipo")
            );

            const descripcion = String(
                campo(incidencia, "descripcion")
            );

            const estado = obtenerEstado(incidencia);

            const coincideTexto = [
                id, pedido, repartidor, tipo, descripcion
            ].some(valor =>
                valor.toLowerCase().includes(texto)
            );

            const coincideEstado =
                estadoSeleccionado === "TODOS" ||
                estado === estadoSeleccionado;

            const coincideTipo =
                tipoSeleccionado === "TODOS" ||
                tipo === tipoSeleccionado;

            return coincideTexto && coincideEstado && coincideTipo;
        });

        contador.textContent =
            filtradas.length +
            (filtradas.length === 1 ? " incidencia" : " incidencias");

        tabla.innerHTML = "";

        if (filtradas.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se encontraron incidencias.
                    </td>
                </tr>
            `;
            return;
        }

        filtradas.forEach(incidencia => {

            const id = obtenerId(incidencia);
            const pedido = campo(incidencia, "idPedido");
            const repartidor = campo(incidencia, "idRepartidor");
            const tipo = campo(incidencia, "tipoIncidencia", "tipo");
            const descripcion = campo(incidencia, "descripcion");
            const fecha = campo(incidencia, "fechaRegistro");
            const estado = obtenerEstado(incidencia);

            const fila = document.createElement("tr");

            crearCelda(fila, id, "id-incidencia");
            crearCelda(fila, pedido);
            crearCelda(fila, repartidor);
            crearCelda(fila, formatoTipo(tipo));
            crearCelda(
                fila,
                String(descripcion).length > 100
                    ? String(descripcion).slice(0, 100) + "..."
                    : descripcion,
                "descripcion-corta"
            );

            crearCelda(fila, formatoFecha(fecha));

            const tdEstado = document.createElement("td");
            const etiqueta = document.createElement("span");

            etiqueta.className = "estado";
            etiqueta.textContent = formatoEstado(estado);

            if (estado === "PENDIENTE") {
                etiqueta.classList.add("estado-pendiente");
            } else if (estado === "EN_REVISION") {
                etiqueta.classList.add("estado-revision");
            } else if (estado === "RESUELTA") {
                etiqueta.classList.add("estado-resuelta");
            }

            tdEstado.appendChild(etiqueta);
            fila.appendChild(tdEstado);

            const tdAcciones = document.createElement("td");
            const acciones = document.createElement("div");

            acciones.className = "acciones-tabla";

            const btnDetalle = document.createElement("button");
            btnDetalle.type = "button";
            btnDetalle.className = "btn-accion btn-detalle";
            btnDetalle.textContent = "Ver detalle";

            btnDetalle.addEventListener("click", function () {
                abrirDetalle(incidencia);
            });

            acciones.appendChild(btnDetalle);

            if (estado === "PENDIENTE") {

                const btnRevision = document.createElement("button");
                btnRevision.type = "button";
                btnRevision.className = "btn-accion btn-revision";
                btnRevision.textContent = "En revisión";

                btnRevision.addEventListener("click", function () {
                    actualizarEstado(id, "EN_REVISION", btnRevision);
                });

                acciones.appendChild(btnRevision);

            } else if (estado === "EN_REVISION") {

                const btnResolver = document.createElement("button");
                btnResolver.type = "button";
                btnResolver.className = "btn-accion btn-resolver";
                btnResolver.textContent = "Resolver";

                btnResolver.addEventListener("click", function () {
                    actualizarEstado(id, "RESUELTA", btnResolver);
                });

                acciones.appendChild(btnResolver);
            }

            tdAcciones.appendChild(acciones);
            fila.appendChild(tdAcciones);

            tabla.appendChild(fila);
        });
    }


    // ============================================
    // ACTUALIZAR ESTADO DE INCIDENCIA
    // ============================================

    async function actualizarEstado(id, nuevoEstado, boton) {

        if (actualizando) return;

        if (!id) {
            mostrarMensaje(
                "No se encontró el identificador de la incidencia.",
                "error"
            );
            return;
        }

        const textoEstado = formatoEstado(nuevoEstado);

        const confirmado = window.confirm(
            "¿Deseas cambiar esta incidencia al estado " +
            textoEstado + "?"
        );

        if (!confirmado) return;

        actualizando = true;
        boton.disabled = true;

        const textoOriginal = boton.textContent;
        boton.textContent = "Guardando...";

        limpiarMensaje();

        try {
            const respuesta = await fetch(
                API_INCIDENCIAS + "/" +
                encodeURIComponent(id) + "/estado",
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        estado: nuevoEstado
                    })
                }
            );

            const datos = await leerRespuesta(respuesta);

            if (!respuesta.ok || datos.estado === "ERROR") {
                throw new Error(
                    datos.mensaje ||
                    "No se pudo actualizar el estado de la incidencia."
                );
            }

            const recargado = await cargarIncidencias();

            if (recargado) {
                mostrarMensaje(
                    datos.mensaje ||
                    "Estado de incidencia actualizado correctamente.",
                    "exito"
                );
            }

        } catch (error) {
            console.error("Error al actualizar incidencia:", error);
            mostrarMensaje(error.message, "error");

        } finally {
            actualizando = false;
            boton.disabled = false;
            boton.textContent = textoOriginal;
        }
    }


    // ============================================
    // MOSTRAR DETALLE DE INCIDENCIA
    // ============================================

    function abrirDetalle(incidencia) {

        document.getElementById("detalleId").textContent =
            obtenerId(incidencia) || "—";

        document.getElementById("detallePedido").textContent =
            campo(incidencia, "idPedido") || "—";

        document.getElementById("detalleRepartidor").textContent =
            campo(incidencia, "idRepartidor") || "—";

        document.getElementById("detalleTipo").textContent =
            formatoTipo(campo(incidencia, "tipoIncidencia", "tipo"));

        document.getElementById("detalleDescripcion").textContent =
            campo(incidencia, "descripcion") || "—";

        document.getElementById("detalleFecha").textContent =
            formatoFecha(campo(incidencia, "fechaRegistro"));

        document.getElementById("detalleEstado").textContent =
            formatoEstado(obtenerEstado(incidencia));

        modal.hidden = false;
        btnCerrarModal.focus();
    }

    function cerrarModal() {
        modal.hidden = true;
    }

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCancelarModal.addEventListener("click", cerrarModal);

    modal.addEventListener("click", function (evento) {
        if (evento.target === modal) {
            cerrarModal();
        }
    });

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape" && !modal.hidden) {
            cerrarModal();
        }
    });


    // ============================================
    // EVENTOS DE FILTROS
    // ============================================

    buscar.addEventListener("input", mostrarIncidencias);
    filtroEstado.addEventListener("change", mostrarIncidencias);
    filtroTipo.addEventListener("change", mostrarIncidencias);

    btnActualizar.addEventListener("click", cargarIncidencias);


    // ============================================
    // CARGA INICIAL
    // ============================================

    mostrarSucursalUsuario();
    cargarIncidencias();

});
