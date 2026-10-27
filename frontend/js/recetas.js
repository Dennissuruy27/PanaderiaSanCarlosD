

"use strict";

// =========================================
// CONFIGURACIÓN
// =========================================

const API_BASE = "http://localhost:8080/PROYECTOWEB/api";
const API_RECETAS = `${API_BASE}/recetas`;
const API_PRODUCTOS = `${API_BASE}/productos/todos`;
const API_SUCURSALES = `${API_BASE}/sucursales`;
const API_LOGOUT = `${API_BASE}/usuarios/logout`;

let recetas = [];
let productos = [];
let recetaSeleccionada = null;
let usuarioActual = null;
let rolActual = "";
let ingredienteEnEdicion = null;

// =========================================
// INICIALIZACIÓN
// =========================================

document.addEventListener("DOMContentLoaded", async () => {
    const sesion = sessionStorage.getItem("usuario");

    if (!sesion) {
        window.location.replace("index.html");
        return;
    }

    try {
        usuarioActual = JSON.parse(sesion);

        if (!usuarioActual || !usuarioActual.rol) {
            throw new Error("Sesión inválida");
        }
    } catch (error) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return;
    }

    rolActual = String(usuarioActual.rol)
        .trim()
        .toUpperCase();

    mostrarUsuario();
    configurarPermisos();
    configurarEventos();

    await Promise.all([
        mostrarSucursalUsuario(),
        cargarRecetas(),
        cargarProductos()
    ]);
});

// =========================================
// USUARIO Y PERMISOS
// =========================================

function mostrarUsuario() {
    document.getElementById("nombreUsuario").textContent =
        usuarioActual.nombreUsuario ||
        usuarioActual.usuario ||
        "Usuario";

    const nombresRoles = {
        ADMIN: "Administrador",
        SUCURSAL: "Encargado de sucursal",
        VENDEDOR: "Vendedor",
        REPARTIDOR: "Repartidor"
    };

    document.getElementById("rolUsuario").textContent =
        nombresRoles[rolActual] || rolActual;
}

async function mostrarSucursalUsuario() {
    const elemento = document.getElementById("sucursalUsuario");
    const idSucursal = usuarioActual.idSucursal;

    if (
        idSucursal === null ||
        idSucursal === undefined ||
        idSucursal === ""
    ) {
        elemento.textContent = "Sin sucursal asignada";
        return;
    }

    elemento.textContent = `Sucursal #${idSucursal}`;

    try {
        const datos = await solicitar(
            `${API_SUCURSALES}/${idSucursal}`
        );

        const sucursal = datos?.sucursal || datos;

        if (sucursal?.nombreSucursal) {
            elemento.textContent =
                `Sucursal: ${sucursal.nombreSucursal}`;
        }
    } catch (error) {
        console.warn(
            "No se pudo consultar la sucursal:",
            error.message
        );
    }
}

function esAdmin() {
    return rolActual === "ADMIN";
}

function puedeGestionar() {
    return rolActual === "ADMIN" ||
        rolActual === "SUCURSAL";
}

function puedeEditarReceta(receta) {
    if (!receta || Number(receta.activo) !== 1) {
        return false;
    }

    if (esAdmin()) {
        return true;
    }

    if (rolActual === "SUCURSAL") {
        return Number(receta.aprobado) === 0 &&
            receta.idUsuarioCreador != null &&
            Number(receta.idUsuarioCreador) ===
            Number(usuarioActual.idUsuario);
    }

    return false;
}

function configurarPermisos() {
    document.getElementById("btnNuevaReceta").hidden =
        !puedeGestionar();

    if (!esAdmin()) {
        const enlaceUsuarios = document.querySelector(
            '.menu a[href="usuarios.html"]'
        );

        if (enlaceUsuarios) {
            enlaceUsuarios.hidden = true;
        }
    }
}

// =========================================
// PETICIONES HTTP
// =========================================

async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "include",
        headers: {
            "Accept": "application/json",
            ...(opciones.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(opciones.headers || {})
        }
    });

    if (respuesta.status === 401) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        throw new Error("La sesión ha expirado.");
    }

    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch (error) {
            throw new Error(
                "El servidor devolvió una respuesta no válida."
            );
        }
    }

    if (!respuesta.ok || datos?.estado === "ERROR") {
        throw new Error(
            datos?.mensaje || `Error HTTP ${respuesta.status}`
        );
    }

    if (datos && !Array.isArray(datos)) {
        const campos = [
            "idSalida",
            "idReceta",
            "idDetalle"
        ];

        for (const campo of campos) {
            if (
                Object.prototype.hasOwnProperty.call(
                    datos, campo
                )
            ) {
                const valor = Number(datos[campo]);

                if (
                    Number.isFinite(valor) &&
                    valor <= 0
                ) {
                    throw new Error(
                        datos.mensaje ||
                        "No se pudo completar la operación."
                    );
                }
            }
        }
    }

    return datos;
}

// =========================================
// CARGAR RECETAS
// =========================================

async function cargarRecetas() {
    const tabla = document.getElementById("tablaRecetas");

    tabla.innerHTML = `
        <tr>
            <td colspan="7" class="sin-datos">
                Cargando recetas...
            </td>
        </tr>
    `;

    try {
        const endpoint = puedeGestionar()
            ? `${API_RECETAS}/todas`
            : API_RECETAS;

        const datos = await solicitar(endpoint);

        recetas = Array.isArray(datos)
            ? datos
            : Array.isArray(datos?.recetas)
                ? datos.recetas
                : [];

        mostrarRecetas();
    } catch (error) {
        tabla.innerHTML = `
            <tr>
                <td colspan="7" class="sin-datos">
                    No se pudieron cargar las recetas.
                </td>
            </tr>
        `;

        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// MOSTRAR RECETAS
// =========================================

function mostrarRecetas() {
    const tabla = document.getElementById("tablaRecetas");

    const busqueda = document.getElementById("buscarReceta")
        .value.trim().toLowerCase();

    const filtro = document.getElementById("filtroEstado").value;

    const filtradas = recetas.filter(receta => {
        const texto = (
            String(receta.nombreReceta || "") + " " +
            String(receta.nombreProducto || "")
        ).toLowerCase();

        if (!texto.includes(busqueda)) {
            return false;
        }

        const activo = Number(receta.activo);
        const aprobado = Number(receta.aprobado);

        if (filtro === "ACTIVAS") {
            return activo === 1;
        }

        if (filtro === "APROBADAS") {
            return activo === 1 && aprobado === 1;
        }

        if (filtro === "PENDIENTES") {
            return activo === 1 && aprobado === 0;
        }

        if (filtro === "INACTIVAS") {
            return activo === 0;
        }

        return true;
    });

    document.getElementById("totalRecetas").textContent =
        `${filtradas.length} ${filtradas.length === 1 ? "receta" : "recetas"
        }`;

    tabla.innerHTML = "";

    if (filtradas.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="7" class="sin-datos">
                    No se encontraron recetas.
                </td>
            </tr>
        `;
        return;
    }

    filtradas.forEach(receta => {
        const id = Number(receta.idReceta);
        const activo = Number(receta.activo);
        const aprobado = Number(receta.aprobado);

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${id}</td>

            <td>${escaparHTML(receta.nombreReceta)}</td>

            <td>${escaparHTML(receta.nombreProducto)}</td>

            <td>${Number(receta.rendimiento)}</td>

            <td>
                <span class="estado ${activo === 1
                ? "estado-activo"
                : "estado-inactivo"
            }">
                    ${activo === 1 ? "Activa" : "Inactiva"}
                </span>
            </td>

            <td>
                <span class="estado ${aprobado === 1
                ? "estado-aprobado"
                : "estado-pendiente"
            }">
                    ${aprobado === 1
                ? "Aprobada"
                : "Pendiente"
            }
                </span>
            </td>

            <td>
                <div class="acciones">

                    <button
                        type="button"
                        class="btn-accion btn-detalle"
                        data-accion="detalle"
                        data-id="${id}">
                        Detalle
                    </button>

                    ${puedeEditarReceta(receta) ? `
                        <button
                            type="button"
                            class="btn-accion btn-editar"
                            data-accion="editar"
                            data-id="${id}">
                            Editar
                        </button>
                    ` : ""}

                    ${esAdmin() &&
                activo === 1 &&
                aprobado === 0 ? `
                        <button
                            type="button"
                            class="btn-accion btn-aprobar"
                            data-accion="aprobar"
                            data-id="${id}">
                            Aprobar
                        </button>
                    ` : ""}

                    ${esAdmin() && activo === 1 ? `
                        <button
                            type="button"
                            class="btn-accion btn-desactivar"
                            data-accion="desactivar"
                            data-id="${id}">
                            Desactivar
                        </button>
                    ` : ""}

                    ${esAdmin() && activo === 0 ? `
                        <button
                            type="button"
                            class="btn-accion btn-reactivar"
                            data-accion="reactivar"
                            data-id="${id}">
                            Reactivar
                        </button>
                    ` : ""}

                </div>
            </td>
        `;

        tabla.appendChild(fila);
    });
}

// =========================================
// PRODUCTOS
// =========================================

async function cargarProductos() {
    try {
        const datos = await solicitar(API_PRODUCTOS);

        productos = Array.isArray(datos)
            ? datos
            : Array.isArray(datos?.productos)
                ? datos.productos
                : [];

        llenarSelectProductos();
    } catch (error) {
        mostrarMensaje(
            "No se pudieron cargar los productos: " +
            error.message,
            "error"
        );
    }
}

function tipoProducto(producto) {
    return String(
        producto.tipoProducto ||
        producto.tipo ||
        ""
    )
        .trim()
        .toUpperCase()
        .replace(/[\s_-]/g, "");
}

function productoDisponible(producto) {
    return Number(producto.activo) === 1 &&
        Number(producto.aprobado) === 1;
}

function llenarSelectProductos() {
    const selectTerminados =
        document.getElementById("productoReceta");

    const selectMaterias =
        document.getElementById("materiaPrima");

    selectTerminados.innerHTML =
        '<option value="">Seleccione un producto</option>';

    selectMaterias.innerHTML =
        '<option value="">Seleccione una materia prima</option>';

    productos.forEach(producto => {
        if (!productoDisponible(producto)) {
            return;
        }

        const tipo = tipoProducto(producto);
        const id = Number(producto.idProducto);
        const nombre = producto.nombreProducto || "";

        const opcion = document.createElement("option");

        opcion.value = id;
        opcion.textContent = nombre;

        if (tipo === "PRODUCTOTERMINADO") {
            selectTerminados.appendChild(opcion);
        }

        if (tipo === "MATERIAPRIMA") {
            selectMaterias.appendChild(opcion);
        }
    });
}

// =========================================
// NUEVA RECETA
// =========================================

function abrirNuevaReceta() {
    if (!puedeGestionar()) {
        return;
    }

    document.getElementById("formReceta").reset();
    document.getElementById("idReceta").value = "";

    document.getElementById("productoReceta").disabled = false;

    document.getElementById("tituloModalReceta").textContent =
        "Registrar nueva receta";

    document.getElementById("btnGuardarReceta").textContent =
        "Guardar receta";

    limpiarMensajeFormulario();
    abrirModal("modalReceta");
}

// =========================================
// EDITAR RECETA
// =========================================

function abrirEditarReceta(idReceta) {
    const receta = recetas.find(
        r => Number(r.idReceta) === Number(idReceta)
    );

    if (!receta || !puedeEditarReceta(receta)) {
        mostrarMensaje(
            "No tiene permisos para editar esta receta.",
            "error"
        );
        return;
    }

    document.getElementById("idReceta").value =
        receta.idReceta;

    const select = document.getElementById("productoReceta");
    select.disabled = true;

    const existeOpcion = Array.from(select.options).some(
        opcion =>
            Number(opcion.value) === Number(receta.idProducto)
    );

    if (!existeOpcion) {
        const opcion = document.createElement("option");

        opcion.value = receta.idProducto;
        opcion.textContent =
            receta.nombreProducto ||
            `Producto #${receta.idProducto}`;

        select.appendChild(opcion);
    }

    select.value = String(receta.idProducto);

    document.getElementById("nombreReceta").value =
        receta.nombreReceta || "";

    document.getElementById("rendimientoReceta").value =
        receta.rendimiento;

    document.getElementById("tituloModalReceta").textContent =
        "Editar receta";

    document.getElementById("btnGuardarReceta").textContent =
        "Guardar cambios";

    limpiarMensajeFormulario();
    abrirModal("modalReceta");
}

// =========================================
// GUARDAR RECETA
// =========================================

async function guardarReceta(evento) {
    evento.preventDefault();

    const idReceta =
        document.getElementById("idReceta").value;

    const idProducto = Number(
        document.getElementById("productoReceta").value
    );

    const nombreReceta = document.getElementById(
        "nombreReceta"
    ).value.trim();

    const rendimiento = Number(
        document.getElementById("rendimientoReceta").value
    );

    if (
        !nombreReceta ||
        !Number.isFinite(rendimiento) ||
        rendimiento <= 0
    ) {
        mostrarMensajeFormulario(
            "Ingrese un nombre y rendimiento válidos.",
            "error"
        );
        return;
    }

    const boton =
        document.getElementById("btnGuardarReceta");

    boton.disabled = true;

    try {
        let resultado;

        if (idReceta) {
            resultado = await solicitar(
                `${API_RECETAS}/${idReceta}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        nombreReceta,
                        rendimiento
                    })
                }
            );

            mostrarMensaje(
                resultado?.mensaje ||
                "Receta actualizada correctamente.",
                "exito"
            );
        } else {
            if (idProducto <= 0) {
                throw new Error(
                    "Seleccione un producto terminado."
                );
            }

            resultado = await solicitar(
                `${API_RECETAS}/propuesta`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        idProducto,
                        nombreReceta,
                        rendimiento
                    })
                }
            );

            mostrarMensaje(
                resultado?.mensaje ||
                "Propuesta registrada correctamente.",
                "exito"
            );
        }

        cerrarModal("modalReceta");
        await cargarRecetas();

    } catch (error) {
        mostrarMensajeFormulario(error.message, "error");
    } finally {
        boton.disabled = false;
    }
}

// =========================================
// DETALLE DE RECETA
// =========================================

async function abrirDetalleReceta(idReceta) {
    const receta = recetas.find(
        r => Number(r.idReceta) === Number(idReceta)
    );

    if (!receta) {
        return;
    }

    recetaSeleccionada = receta;
    ingredienteEnEdicion = null;

    document.getElementById("tituloDetalle").textContent =
        receta.nombreReceta || "Detalle de receta";

    document.getElementById("descripcionDetalle").textContent =
        `${receta.nombreProducto || "Producto"} | ` +
        `Rendimiento: ${receta.rendimiento}`;

    const activo = Number(receta.activo);
    const aprobado = Number(receta.aprobado);

    document.getElementById("estadoDetalle").innerHTML = `
        <span class="estado ${activo === 1
            ? "estado-activo"
            : "estado-inactivo"
        }">
            ${activo === 1 ? "Activa" : "Inactiva"}
        </span>

        <span class="estado ${aprobado === 1
            ? "estado-aprobado"
            : "estado-pendiente"
        }">
            ${aprobado === 1 ? "Aprobada" : "Pendiente"}
        </span>
    `;

    document.getElementById("formIngrediente").hidden =
        !puedeEditarReceta(receta);

    document.getElementById("formIngrediente").reset();

    abrirModal("modalDetalle");
    await cargarIngredientes();
}

// =========================================
// CARGAR INGREDIENTES
// =========================================

async function cargarIngredientes() {
    if (!recetaSeleccionada) {
        return;
    }

    const tabla =
        document.getElementById("tablaIngredientes");

    tabla.innerHTML = `
        <tr>
            <td colspan="4" class="sin-datos">
                Cargando ingredientes...
            </td>
        </tr>
    `;

    try {
        const idReceta = recetaSeleccionada.idReceta;

        const datos = await solicitar(
            `${API_RECETAS}/${idReceta}/detalle`
        );

        // Evitar mostrar datos de otra receta si el
        // usuario cambió de modal durante la petición.
        if (
            !recetaSeleccionada ||
            Number(recetaSeleccionada.idReceta) !==
            Number(idReceta)
        ) {
            return;
        }

        const detalles = Array.isArray(datos)
            ? datos
            : Array.isArray(datos?.detalle)
                ? datos.detalle
                : [];

        ingredienteEnEdicion = null;
        tabla.innerHTML = "";

        if (detalles.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="4" class="sin-datos">
                        Esta receta no tiene ingredientes registrados.
                    </td>
                </tr>
            `;
            return;
        }

        detalles.forEach(detalle => {
            const fila = document.createElement("tr");

            const idDetalle = Number(detalle.idDetalle);

            const mostrarAcciones =
                esAdmin() &&
                puedeEditarReceta(recetaSeleccionada);

            fila.dataset.idDetalle = idDetalle;

            fila.innerHTML = `
                <td>
                    ${escaparHTML(detalle.nombreProducto)}
                </td>

                <td>
                    ${escaparHTML(detalle.unidadMedida)}
                </td>

                <td class="celda-cantidad">
                    <span class="cantidad-actual">
                        ${Number(detalle.cantidadD)}
                    </span>
                </td>

                <td>
                    <div class="acciones">
                        ${mostrarAcciones ? `
                            <button
                                type="button"
                                class="btn-accion btn-editar"
                                data-accion="editar-cantidad"
                                data-id="${idDetalle}">
                                Editar cantidad
                            </button>

                            <button
                                type="button"
                                class="btn-accion btn-eliminar"
                                data-accion="eliminar-ingrediente"
                                data-id="${idDetalle}">
                                Eliminar
                            </button>
                        ` : "—"}
                    </div>
                </td>
            `;

            tabla.appendChild(fila);
        });

    } catch (error) {
        tabla.innerHTML = `
            <tr>
                <td colspan="4" class="sin-datos">
                    No se pudieron cargar los ingredientes.
                </td>
            </tr>
        `;

        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// NUEVO: EDITAR CANTIDAD DEL INGREDIENTE
// =========================================

function editarCantidadIngrediente(idDetalle) {
    if (
        !esAdmin() ||
        !recetaSeleccionada ||
        !puedeEditarReceta(recetaSeleccionada)
    ) {
        mostrarMensaje(
            "Solo el administrador puede modificar cantidades.",
            "error"
        );
        return;
    }

    if (ingredienteEnEdicion !== null) {
        mostrarMensaje(
            "Guarde o cancele la edición actual primero.",
            "error"
        );
        return;
    }

    const fila = Array.from(
        document.querySelectorAll(
            "#tablaIngredientes tr[data-id-detalle]"
        )
    ).find(
        elemento =>
            Number(elemento.dataset.idDetalle) ===
            Number(idDetalle)
    );

    if (!fila) {
        return;
    }

    const celda = fila.querySelector(".celda-cantidad");
    const cantidadActual = Number(
        celda.querySelector(".cantidad-actual").textContent
    );

    ingredienteEnEdicion = idDetalle;

    celda.innerHTML = "";

    const input = document.createElement("input");

    input.type = "number";
    input.min = "0.000001";
    input.step = "any";
    input.value = String(cantidadActual);
    input.className = "input-editar-cantidad";
    input.dataset.idDetalle = idDetalle;

    input.style.width = "110px";
    input.style.maxWidth = "100%";
    input.style.padding = "7px";
    input.style.border = "1px solid #b89b76";
    input.style.borderRadius = "6px";

    celda.appendChild(input);

    const acciones = fila.querySelector(".acciones");

    acciones.innerHTML = `
        <button
            type="button"
            class="btn-accion btn-aprobar"
            data-accion="guardar-cantidad"
            data-id="${idDetalle}">
            Guardar
        </button>

        <button
            type="button"
            class="btn-accion btn-detalle"
            data-accion="cancelar-cantidad"
            data-id="${idDetalle}">
            Cancelar
        </button>
    `;

    input.focus();
    input.select();
}

// =========================================
// NUEVO: GUARDAR CANTIDAD MODIFICADA
// =========================================

async function guardarCantidadIngrediente(idDetalle) {
    if (
        !esAdmin() ||
        !recetaSeleccionada ||
        !puedeEditarReceta(recetaSeleccionada)
    ) {
        mostrarMensaje(
            "No tiene permisos para modificar ingredientes.",
            "error"
        );
        return;
    }

    const input = document.querySelector(
        `#tablaIngredientes input[data-id-detalle="${idDetalle}"]`
    );

    if (!input) {
        return;
    }

    const cantidadD = Number(input.value);

    if (
        input.value.trim() === "" ||
        !Number.isFinite(cantidadD) ||
        cantidadD <= 0
    ) {
        mostrarMensaje(
            "La cantidad debe ser un número mayor que cero.",
            "error"
        );

        input.focus();
        return;
    }

    const fila = input.closest("tr");

    const boton = fila.querySelector(
        '[data-accion="guardar-cantidad"]'
    );

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Guardando...";
    }

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/detalle/${idDetalle}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    cantidadD: cantidadD
                })
            }
        );

        ingredienteEnEdicion = null;

        mostrarMensaje(
            resultado?.mensaje ||
            "Cantidad actualizada correctamente.",
            "exito"
        );

        // Se consulta nuevamente Oracle para
        // mostrar la cantidad realmente guardada.
        await cargarIngredientes();

    } catch (error) {
        mostrarMensaje(error.message, "error");

        if (boton) {
            boton.disabled = false;
            boton.textContent = "Guardar";
        }
    }
}

// =========================================
// NUEVO: CANCELAR EDICIÓN DE CANTIDAD
// =========================================

async function cancelarEdicionCantidad() {
    ingredienteEnEdicion = null;
    await cargarIngredientes();
}

// =========================================
// AGREGAR INGREDIENTE
// =========================================

async function agregarIngrediente(evento) {
    evento.preventDefault();

    if (
        !recetaSeleccionada ||
        !puedeEditarReceta(recetaSeleccionada)
    ) {
        mostrarMensaje(
            "No tiene permisos para modificar esta receta.",
            "error"
        );
        return;
    }

    const idProducto = Number(
        document.getElementById("materiaPrima").value
    );

    const cantidadD = Number(
        document.getElementById("cantidadIngrediente").value
    );

    if (
        idProducto <= 0 ||
        !Number.isFinite(cantidadD) ||
        cantidadD <= 0
    ) {
        mostrarMensaje(
            "Seleccione una materia prima y una cantidad válida.",
            "error"
        );
        return;
    }

    const boton =
        document.getElementById("btnAgregarIngrediente");

    boton.disabled = true;

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/${recetaSeleccionada.idReceta}/detalle`,
            {
                method: "POST",
                body: JSON.stringify({
                    idProducto,
                    cantidadD
                })
            }
        );

        mostrarMensaje(
            resultado?.mensaje ||
            "Ingrediente agregado correctamente.",
            "exito"
        );

        document.getElementById("formIngrediente").reset();
        await cargarIngredientes();

    } catch (error) {
        mostrarMensaje(error.message, "error");
    } finally {
        boton.disabled = false;
    }
}

// =========================================
// ELIMINAR INGREDIENTE
// =========================================

async function eliminarIngrediente(idDetalle) {
    if (
        !esAdmin() ||
        !recetaSeleccionada ||
        !puedeEditarReceta(recetaSeleccionada)
    ) {
        return;
    }

    if (
        !confirm(
            "¿Está seguro de eliminar este ingrediente?"
        )
    ) {
        return;
    }

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/detalle/${idDetalle}`,
            {
                method: "DELETE"
            }
        );

        mostrarMensaje(
            resultado?.mensaje ||
            "Ingrediente eliminado correctamente.",
            "exito"
        );

        await cargarIngredientes();

    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// APROBAR RECETA
// =========================================

async function aprobarReceta(idReceta) {
    if (!esAdmin()) {
        return;
    }

    if (!confirm("¿Desea aprobar esta receta?")) {
        return;
    }

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/${idReceta}/aprobar`,
            {
                method: "PUT"
            }
        );

        mostrarMensaje(
            resultado?.mensaje ||
            "Receta aprobada correctamente.",
            "exito"
        );

        await cargarRecetas();

    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// DESACTIVAR RECETA
// =========================================

async function desactivarReceta(idReceta) {
    if (!esAdmin()) {
        return;
    }

    if (
        !confirm(
            "¿Está seguro de desactivar esta receta?"
        )
    ) {
        return;
    }

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/${idReceta}`,
            {
                method: "DELETE"
            }
        );

        mostrarMensaje(
            resultado?.mensaje ||
            "Receta desactivada correctamente.",
            "exito"
        );

        await cargarRecetas();

    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// REACTIVAR RECETA
// =========================================

async function reactivarReceta(idReceta) {
    if (!esAdmin()) {
        return;
    }

    if (!confirm("¿Desea reactivar esta receta?")) {
        return;
    }

    try {
        const resultado = await solicitar(
            `${API_RECETAS}/${idReceta}/reactivar`,
            {
                method: "PUT"
            }
        );

        mostrarMensaje(
            resultado?.mensaje ||
            "Receta reactivada correctamente.",
            "exito"
        );

        await cargarRecetas();

    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

// =========================================
// CERRAR SESIÓN
// =========================================

async function cerrarSesion() {
    const boton =
        document.getElementById("btnCerrarSesion");

    boton.disabled = true;

    try {
        await solicitar(API_LOGOUT, {
            method: "POST"
        });

        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");

    } catch (error) {
        boton.disabled = false;

        alert(
            "No se pudo cerrar la sesión: " +
            error.message
        );
    }
}

// =========================================
// EVENTOS
// =========================================

function configurarEventos() {
    document.getElementById("btnNuevaReceta")
        .addEventListener(
            "click",
            abrirNuevaReceta
        );

    document.getElementById("btnActualizar")
        .addEventListener(
            "click",
            cargarRecetas
        );

    document.getElementById("buscarReceta")
        .addEventListener(
            "input",
            mostrarRecetas
        );

    document.getElementById("filtroEstado")
        .addEventListener(
            "change",
            mostrarRecetas
        );

    document.getElementById("formReceta")
        .addEventListener(
            "submit",
            guardarReceta
        );

    document.getElementById("formIngrediente")
        .addEventListener(
            "submit",
            agregarIngrediente
        );

    document.getElementById("btnCerrarSesion")
        .addEventListener(
            "click",
            cerrarSesion
        );

    // ACCIONES DE RECETAS

    document.getElementById("tablaRecetas")
        .addEventListener("click", evento => {
            const boton = evento.target.closest(
                "button[data-accion]"
            );

            if (!boton) {
                return;
            }

            const id = Number(boton.dataset.id);

            switch (boton.dataset.accion) {
                case "detalle":
                    abrirDetalleReceta(id);
                    break;

                case "editar":
                    abrirEditarReceta(id);
                    break;

                case "aprobar":
                    aprobarReceta(id);
                    break;

                case "desactivar":
                    desactivarReceta(id);
                    break;

                case "reactivar":
                    reactivarReceta(id);
                    break;
            }
        });

    // ACCIONES DE INGREDIENTES

    document.getElementById("tablaIngredientes")
        .addEventListener("click", evento => {
            const boton = evento.target.closest(
                "button[data-accion]"
            );

            if (!boton) {
                return;
            }

            const id = Number(boton.dataset.id);

            switch (boton.dataset.accion) {
                case "editar-cantidad":
                    editarCantidadIngrediente(id);
                    break;

                case "guardar-cantidad":
                    guardarCantidadIngrediente(id);
                    break;

                case "cancelar-cantidad":
                    cancelarEdicionCantidad();
                    break;

                case "eliminar-ingrediente":
                    eliminarIngrediente(id);
                    break;
            }
        });

    // GUARDAR CANTIDAD CON ENTER

    document.getElementById("tablaIngredientes")
        .addEventListener("keydown", evento => {
            if (
                evento.key === "Enter" &&
                evento.target.matches(
                    ".input-editar-cantidad"
                )
            ) {
                evento.preventDefault();

                guardarCantidadIngrediente(
                    Number(evento.target.dataset.idDetalle)
                );
            }

            if (
                evento.key === "Escape" &&
                evento.target.matches(
                    ".input-editar-cantidad"
                )
            ) {
                evento.preventDefault();
                evento.stopPropagation();
                cancelarEdicionCantidad();
            }
        });

    // CERRAR MODALES CON BOTONES

    document.querySelectorAll("[data-cerrar]")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                cerrarModal(boton.dataset.cerrar);
            });
        });

    // CERRAR MODALES AL HACER CLIC FUERA

    document.querySelectorAll(".modal")
        .forEach(modal => {
            modal.addEventListener("click", evento => {
                if (evento.target === modal) {
                    cerrarModal(modal.id);
                }
            });
        });

    // CERRAR MODALES CON ESCAPE

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            document.querySelectorAll(".modal")
                .forEach(modal => {
                    modal.hidden = true;
                });

            ingredienteEnEdicion = null;
        }
    });
}

// =========================================
// UTILIDADES
// =========================================

function abrirModal(id) {
    document.getElementById(id).hidden = false;
}

function cerrarModal(id) {
    document.getElementById(id).hidden = true;

    if (id === "modalDetalle") {
        ingredienteEnEdicion = null;
    }
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function mostrarMensaje(texto, tipo = "error") {
    const elemento =
        document.getElementById("mensajeRecetas");

    elemento.textContent = texto;
    elemento.className = `mensaje ${tipo}`;
}

function mostrarMensajeFormulario(
    texto,
    tipo = "error"
) {
    const elemento =
        document.getElementById("mensajeFormulario");

    elemento.textContent = texto;
    elemento.className =
        `mensaje-formulario ${tipo}`;
}

function limpiarMensajeFormulario() {
    const elemento =
        document.getElementById("mensajeFormulario");

    elemento.textContent = "";
    elemento.className = "mensaje-formulario";
}



