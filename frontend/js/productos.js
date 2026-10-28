
document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACIÓN DE API
    // ============================================

    
const API_PRODUCTOS =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/productos";

const API_SUCURSALES =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/sucursales";

const API_LOGOUT =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios/logout";


    // ============================================
    // ELEMENTOS DEL HTML
    // ============================================

    const tabla = document.getElementById("tablaProductos");
    const contador = document.getElementById("totalProductos");
    const buscar = document.getElementById("buscarProducto");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroEstado = document.getElementById("filtroEstado");
    const mensaje = document.getElementById("mensajeProductos");

    const btnNuevoProducto =
        document.getElementById("btnNuevoProducto");

    const modalProducto =
        document.getElementById("modalProducto");

    const tituloModal =
        document.getElementById("tituloModalProducto");

    const idProductoEditar =
        document.getElementById("idProductoEditar");

    const btnCerrarModal =
        document.getElementById("btnCerrarModal");

    const btnCancelarProducto =
        document.getElementById("btnCancelarProducto");

    const formProducto =
        document.getElementById("formProducto");

    const btnGuardarProducto =
        document.getElementById("btnGuardarProducto");

    const mensajeFormulario =
        document.getElementById("mensajeFormulario");

    const nombreProducto =
        document.getElementById("nombreProducto");

    const tipoProducto =
        document.getElementById("tipoProducto");

    const unidadMedida =
        document.getElementById("unidadMedida");

    const existenciaMinima =
        document.getElementById("existenciaMinima");

    const precioP =
        document.getElementById("precioP");

    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const rolUsuario =
        document.getElementById("rolUsuario");

    const sucursalUsuario =
        document.getElementById("sucursalUsuario");

    const btnCerrarSesion =
        document.getElementById("btnCerrarSesion");

    let productos = [];
    let usuarioActual = null;

    // ============================================
    // VERIFICAR SESIÓN
    // ============================================

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
            typeof usuarioActual !== "object"
        ) {
            throw new Error("Sesión inválida");
        }

    } catch (error) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return;
    }

    const rolActual =
        String(usuarioActual.rol || "").toUpperCase();

    const esAdmin = rolActual === "ADMIN";

    // ============================================
    // MOSTRAR USUARIO Y ROL
    // ============================================

    const nombresRoles = {
        ADMIN: "Administrador",
        SUCURSAL: "Encargado de sucursal",
        VENDEDOR: "Vendedor",
        REPARTIDOR: "Repartidor"
    };

    if (nombreUsuario) {
        nombreUsuario.textContent =
            usuarioActual.nombreUsuario ||
            usuarioActual.usuario ||
            "Usuario";
    }

    if (rolUsuario) {
        rolUsuario.textContent =
            nombresRoles[rolActual] || "Sin rol";
    }

    // ============================================
    // MOSTRAR SUCURSAL DEL USUARIO
    // ============================================

    async function mostrarSucursalUsuario() {

        if (!sucursalUsuario) return;

        const idSucursal = usuarioActual.idSucursal;

        if (
            idSucursal === null ||
            idSucursal === undefined ||
            String(idSucursal).trim() === ""
        ) {
            sucursalUsuario.textContent =
                "Sin sucursal asignada";
            return;
        }

        const id = Number(idSucursal);

        if (!Number.isInteger(id) || id <= 0) {
            sucursalUsuario.textContent =
                "Sucursal no disponible";
            return;
        }

        sucursalUsuario.textContent =
            "Cargando sucursal...";

        try {
            const respuesta = await fetch(
                API_SUCURSALES + "/" +
                encodeURIComponent(id),
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "Error HTTP " + respuesta.status
                );
            }

            const datos = await respuesta.json();

            if (
                !datos.sucursal ||
                !datos.sucursal.nombreSucursal
            ) {
                throw new Error(
                    "Sucursal no encontrada"
                );
            }

            sucursalUsuario.textContent =
                "Sucursal: " +
                datos.sucursal.nombreSucursal;

        } catch (error) {
            console.error(
                "Error al consultar sucursal:",
                error
            );

            sucursalUsuario.textContent =
                "Sucursal #" + id;
        }
    }

    // ============================================
    // CERRAR SESIÓN
    // ============================================

    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener(
            "click",
            async function () {

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
                            "No se pudo cerrar sesión"
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
        );
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================

    function campo(producto, ...nombres) {
        for (const nombre of nombres) {
            if (
                producto[nombre] !== undefined &&
                producto[nombre] !== null
            ) {
                return producto[nombre];
            }
        }

        return "";
    }

    function esValorUno(valor) {
        return valor === 1 ||
            valor === true ||
            valor === "1";
    }

    function esValorCero(valor) {
        return valor === 0 ||
            valor === false ||
            valor === "0";
    }

    function mostrarMensaje(texto, tipo = "exito") {
        mensaje.textContent = texto;
        mensaje.className = "mensaje " + tipo;
    }

    function mostrarMensajeFormulario(
        texto,
        tipo = "error"
    ) {
        mensajeFormulario.textContent = texto;
        mensajeFormulario.className =
            "mensaje-formulario " + tipo;
    }

    function limpiarMensajeFormulario() {
        mensajeFormulario.textContent = "";
        mensajeFormulario.className =
            "mensaje-formulario";
    }

    function resultadoFallido(respuesta, datos) {
        return !respuesta.ok ||
            datos.estado === "ERROR" ||
            (
                datos.idSalida !== undefined &&
                datos.idSalida !== null &&
                Number(datos.idSalida) <= 0
            ) ||
            (
                datos.idProducto !== undefined &&
                datos.idProducto !== null &&
                Number(datos.idProducto) <= 0
            );
    }

    async function leerRespuesta(respuesta) {
        const texto = await respuesta.text();

        if (!texto.trim()) {
            return {};
        }

        try {
            return JSON.parse(texto);
        } catch (error) {
            throw new Error(
                "El servidor no devolvió JSON válido"
            );
        }
    }

    // ============================================
    // CARGAR PRODUCTOS DESDE ORACLE
    // ============================================

    async function cargarProductos() {

        tabla.innerHTML = `
            <tr>
                <td colspan="9" class="sin-datos">
                    Cargando productos...
                </td>
            </tr>
        `;

        mensaje.textContent = "";
        mensaje.className = "mensaje";

        try {
            const respuesta = await fetch(
                API_PRODUCTOS + "/todos",
                {
                    credentials: "include"
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "HTTP " + respuesta.status
                );
            }

            const datos = await respuesta.json();

            if (Array.isArray(datos)) {
                productos = datos;
            } else if (Array.isArray(datos.productos)) {
                productos = datos.productos;
            } else {
                throw new Error(
                    "Formato de productos no reconocido"
                );
            }

            mostrarProductos();
            return true;

        } catch (error) {
            console.error(
                "Error al cargar productos:",
                error
            );

            productos = [];
            contador.textContent = "0 productos";

            tabla.innerHTML = `
                <tr>
                    <td colspan="9" class="sin-datos">
                        No se pudieron cargar los productos.
                    </td>
                </tr>
            `;

            mostrarMensaje(
                "Verifica que Tomcat esté ejecutándose " +
                "y que /api/productos/todos responda.",
                "error"
            );

            return false;
        }
    }

    // ============================================
    // MOSTRAR PRODUCTOS Y FILTROS
    // ============================================

    function mostrarProductos() {

        const texto =
            buscar.value.trim().toLowerCase();

        const tipoSeleccionado =
            filtroTipo.value
                .toUpperCase()
                .replace(/[\s_-]/g, "");

        const estadoSeleccionado =
            filtroEstado ? filtroEstado.value : "1";

        const filtrados = productos.filter(producto => {

            const nombre = String(
                campo(
                    producto,
                    "nombreProducto",
                    "NOMBRE_PRODUCTO"
                )
            ).toLowerCase();

            const tipo = String(
                campo(
                    producto,
                    "tipoProducto",
                    "TIPO_PRODUCTO"
                )
            ).toUpperCase().replace(/[\s_-]/g, "");

            const activo = campo(
                producto,
                "activo",
                "ACTIVO"
            );

            const coincideNombre =
                nombre.includes(texto);

            const coincideTipo =
                tipoSeleccionado === "" ||
                tipo === tipoSeleccionado;

            const coincideEstado =
                estadoSeleccionado === "todos" ||
                (
                    estadoSeleccionado === "1" &&
                    esValorUno(activo)
                ) ||
                (
                    estadoSeleccionado === "0" &&
                    esValorCero(activo)
                );

            return coincideNombre &&
                coincideTipo &&
                coincideEstado;
        });

        contador.textContent =
            filtrados.length + " productos";

        tabla.innerHTML = "";

        if (filtrados.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="9" class="sin-datos">
                        No se encontraron productos.
                    </td>
                </tr>
            `;
            return;
        }

        filtrados.forEach(producto => {

            const id = campo(
                producto, "idProducto", "ID_PRODUCTO"
            );

            const nombre = campo(
                producto, "nombreProducto", "NOMBRE_PRODUCTO"
            );

            const tipo = campo(
                producto, "tipoProducto", "TIPO_PRODUCTO"
            );

            const unidad = campo(
                producto, "unidadMedida", "UNIDAD_MEDIDA"
            );

            const existencia = campo(
                producto, "existencia", "EXISTENCIA"
            );

            const precio = campo(
                producto, "precioP", "precio", "PRECIO_P"
            );

            const activo = campo(
                producto, "activo", "ACTIVO"
            );

            const aprobado = campo(
                producto, "aprobado", "APROBADO"
            );

            const fila = document.createElement("tr");

            function agregarCelda(valor) {
                const td = document.createElement("td");

                td.textContent =
                    valor === "" ? "—" : valor;

                fila.appendChild(td);
                return td;
            }

            agregarCelda(id);
            agregarCelda(nombre);
            agregarCelda(tipo);
            agregarCelda(unidad);
            agregarCelda(existencia);

            const numeroPrecio = Number(precio);

            agregarCelda(
                precio === "" ||
                    !Number.isFinite(numeroPrecio)
                    ? "—"
                    : "Q " + numeroPrecio.toFixed(2)
            );

            // ESTADO

            const tdEstado =
                document.createElement("td");

            const etiquetaEstado =
                document.createElement("span");

            etiquetaEstado.className = "estado";

            if (esValorUno(activo)) {
                etiquetaEstado.classList.add(
                    "estado-activo"
                );
                etiquetaEstado.textContent = "Activo";

            } else if (esValorCero(activo)) {
                etiquetaEstado.classList.add(
                    "estado-inactivo"
                );
                etiquetaEstado.textContent =
                    "Desactivado";

            } else {
                etiquetaEstado.textContent =
                    "Sin información";
            }

            tdEstado.appendChild(etiquetaEstado);
            fila.appendChild(tdEstado);

            // APROBACIÓN

            const tdAprobacion =
                document.createElement("td");

            const etiquetaAprobacion =
                document.createElement("span");

            etiquetaAprobacion.className = "estado";

            if (esValorUno(aprobado)) {
                etiquetaAprobacion.classList.add(
                    "estado-activo"
                );
                etiquetaAprobacion.textContent =
                    "Aprobado";

            } else if (esValorCero(aprobado)) {
                etiquetaAprobacion.classList.add(
                    "estado-pendiente"
                );
                etiquetaAprobacion.textContent =
                    "Pendiente";

            } else {
                etiquetaAprobacion.textContent =
                    "Sin información";
            }

            tdAprobacion.appendChild(
                etiquetaAprobacion
            );

            fila.appendChild(tdAprobacion);

            // ACCIONES

            const tdAcciones =
                document.createElement("td");

            tdAcciones.style.whiteSpace = "nowrap";

            const productoActivo = esValorUno(activo);
            const productoDesactivado = esValorCero(activo);
            const pendiente = esValorCero(aprobado);
            const idValido = Number(id) > 0;

            function crearBoton(
                texto,
                clase,
                color,
                accion
            ) {
                const boton =
                    document.createElement("button");

                boton.type = "button";
                boton.textContent = texto;
                boton.className = clase;

                boton.style.backgroundColor = color;
                boton.style.color = "#ffffff";
                boton.style.border = "none";
                boton.style.padding = "8px 12px";
                boton.style.borderRadius = "6px";
                boton.style.cursor = "pointer";
                boton.style.marginRight = "6px";

                boton.addEventListener(
                    "click",
                    () => accion(boton)
                );

                tdAcciones.appendChild(boton);
            }

            if (esAdmin && productoActivo && idValido) {

                crearBoton(
                    "Editar",
                    "btn-editar",
                    "#8B5E3C",
                    () => abrirModalEditar(producto)
                );

                crearBoton(
                    "Desactivar",
                    "btn-desactivar",
                    "#b3261e",
                    boton => desactivarProducto(
                        id,
                        nombre,
                        boton
                    )
                );
            }

            if (
                esAdmin &&
                productoActivo &&
                pendiente &&
                idValido
            ) {
                crearBoton(
                    "Aprobar",
                    "btn-aprobar",
                    "#2e7d32",
                    boton => aprobarProducto(
                        id,
                        nombre,
                        boton
                    )
                );
            }

            if (
                esAdmin &&
                productoDesactivado &&
                idValido
            ) {
                crearBoton(
                    "Reactivar",
                    "btn-reactivar",
                    "#2e7d32",
                    boton => reactivarProducto(
                        id,
                        nombre,
                        boton
                    )
                );
            }

            if (tdAcciones.children.length === 0) {
                tdAcciones.textContent = "—";
            }

            fila.appendChild(tdAcciones);
            tabla.appendChild(fila);
        });
    }

    // ============================================
    // APROBAR PRODUCTO
    // ============================================

    async function aprobarProducto(id, nombre, boton) {

        if (!esAdmin) {
            mostrarMensaje(
                "No tiene permisos para aprobar productos.",
                "error"
            );
            return;
        }

        if (!window.confirm(
            '¿Desea aprobar el producto "' + nombre + '"?'
        )) {
            return;
        }

        boton.disabled = true;
        boton.textContent = "Aprobando...";

        try {
            const respuesta = await fetch(
                API_PRODUCTOS + "/" +
                encodeURIComponent(id) + "/aprobar",
                {
                    method: "PUT",
                    credentials: "include"
                }
            );

            const datos = await leerRespuesta(respuesta);

            if (resultadoFallido(respuesta, datos)) {
                mostrarMensaje(
                    datos.mensaje ||
                    "No se pudo aprobar el producto.",
                    "error"
                );
                return;
            }

            if (await cargarProductos()) {
                mostrarMensaje(
                    datos.mensaje ||
                    "Producto aprobado correctamente.",
                    "exito"
                );
            }

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible completar la aprobación.",
                "error"
            );

        } finally {
            boton.disabled = false;
            boton.textContent = "Aprobar";
        }
    }

    // ============================================
    // DESACTIVAR PRODUCTO
    // ============================================

    async function desactivarProducto(id, nombre, boton) {

        if (!esAdmin) {
            mostrarMensaje(
                "No tiene permisos para desactivar productos.",
                "error"
            );
            return;
        }

        if (Number(id) <= 0) {
            mostrarMensaje(
                "El ID del producto no es válido.",
                "error"
            );
            return;
        }

        const confirmar = window.confirm(
            '¿Está seguro de que desea desactivar el producto "' +
            nombre + '"?\n\n' +
            "El producto dejará de aparecer en el listado " +
            "de productos activos."
        );

        if (!confirmar) return;

        boton.disabled = true;
        boton.textContent = "Desactivando...";

        try {
            const respuesta = await fetch(
                API_PRODUCTOS + "/" +
                encodeURIComponent(id),
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            const datos = await leerRespuesta(respuesta);

            if (resultadoFallido(respuesta, datos)) {
                mostrarMensaje(
                    datos.mensaje ||
                    "No se pudo desactivar el producto.",
                    "error"
                );
                return;
            }

            if (await cargarProductos()) {
                mostrarMensaje(
                    datos.mensaje ||
                    "Producto desactivado correctamente.",
                    "exito"
                );
            }

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible completar la desactivación.",
                "error"
            );

        } finally {
            boton.disabled = false;
            boton.textContent = "Desactivar";
        }
    }

    // ============================================
    // REACTIVAR PRODUCTO
    // ============================================

    async function reactivarProducto(id, nombre, boton) {

        if (!esAdmin) {
            mostrarMensaje(
                "No tiene permisos para reactivar productos.",
                "error"
            );
            return;
        }

        if (
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0
        ) {
            mostrarMensaje(
                "El ID del producto no es válido.",
                "error"
            );
            return;
        }

        const confirmar = window.confirm(
            '¿Está seguro de que desea reactivar el producto "' +
            nombre + '"?\n\n' +
            "El producto volverá a aparecer en el listado " +
            "de productos activos."
        );

        if (!confirmar) return;

        boton.disabled = true;
        boton.textContent = "Reactivando...";

        try {
            const respuesta = await fetch(
                API_PRODUCTOS + "/" +
                encodeURIComponent(id) + "/reactivar",
                {
                    method: "PUT",
                    credentials: "include"
                }
            );

            const datos = await leerRespuesta(respuesta);

            if (resultadoFallido(respuesta, datos)) {
                mostrarMensaje(
                    datos.mensaje ||
                    "No se pudo reactivar el producto.",
                    "error"
                );
                return;
            }

            if (await cargarProductos()) {
                mostrarMensaje(
                    datos.mensaje ||
                    "Producto reactivado correctamente.",
                    "exito"
                );
            }

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible completar la reactivación.",
                "error"
            );

        } finally {
            boton.disabled = false;
            boton.textContent = "Reactivar";
        }
    }

    // ============================================
    // ABRIR FORMULARIO NUEVO
    // ============================================

    function abrirModalNuevo() {

        formProducto.reset();
        idProductoEditar.value = "";

        tituloModal.textContent =
            "Registrar nuevo producto";

        btnGuardarProducto.textContent =
            "Guardar producto";

        limpiarMensajeFormulario();

        modalProducto.hidden = false;
        nombreProducto.focus();
    }

    // ============================================
    // ABRIR FORMULARIO EDITAR
    // ============================================

    function abrirModalEditar(producto) {

        if (!esAdmin) {
            mostrarMensaje(
                "No tiene permisos para editar productos.",
                "error"
            );
            return;
        }

        const id = campo(
            producto,
            "idProducto",
            "ID_PRODUCTO"
        );

        if (Number(id) <= 0) {
            mostrarMensaje(
                "ID de producto inválido.",
                "error"
            );
            return;
        }

        formProducto.reset();

        idProductoEditar.value = id;

        nombreProducto.value = campo(
            producto,
            "nombreProducto",
            "NOMBRE_PRODUCTO"
        );

        tipoProducto.value = campo(
            producto,
            "tipoProducto",
            "TIPO_PRODUCTO"
        );

        unidadMedida.value = campo(
            producto,
            "unidadMedida",
            "UNIDAD_MEDIDA"
        );

        existenciaMinima.value = campo(
            producto,
            "existenciaMinima",
            "EXISTENCIA_MINIMA"
        );

        precioP.value = campo(
            producto,
            "precioP",
            "PRECIO_P"
        );

        tituloModal.textContent =
            "Editar producto #" + id;

        btnGuardarProducto.textContent =
            "Guardar cambios";

        limpiarMensajeFormulario();

        modalProducto.hidden = false;
        nombreProducto.focus();
    }

    // ============================================
    // CERRAR FORMULARIO
    // ============================================

    function cerrarModalProducto() {

        if (btnGuardarProducto.disabled) {
            return;
        }

        modalProducto.hidden = true;

        formProducto.reset();
        idProductoEditar.value = "";

        limpiarMensajeFormulario();
    }

    btnNuevoProducto.addEventListener(
        "click",
        abrirModalNuevo
    );

    btnCerrarModal.addEventListener(
        "click",
        cerrarModalProducto
    );

    btnCancelarProducto.addEventListener(
        "click",
        cerrarModalProducto
    );

    modalProducto.addEventListener(
        "click",
        function (event) {
            if (event.target === modalProducto) {
                cerrarModalProducto();
            }
        }
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape" &&
                !modalProducto.hidden
            ) {
                cerrarModalProducto();
            }
        }
    );

    // ============================================
    // GUARDAR PRODUCTO
    // ============================================

    formProducto.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const idEditar =
                idProductoEditar.value.trim();

            const esEdicion = idEditar !== "";

            if (esEdicion && !esAdmin) {
                mostrarMensajeFormulario(
                    "No tiene permisos para editar productos."
                );
                return;
            }

            const datosProducto = {
                nombreProducto:
                    nombreProducto.value.trim(),

                tipoProducto:
                    tipoProducto.value,

                unidadMedida:
                    unidadMedida.value,

                existenciaMinima:
                    Number(existenciaMinima.value),

                precioP:
                    Number(precioP.value)
            };

            if (!esEdicion) {
                datosProducto.existencia = 0;
            }

            if (
                !datosProducto.nombreProducto ||
                !datosProducto.tipoProducto ||
                !datosProducto.unidadMedida
            ) {
                mostrarMensajeFormulario(
                    "Complete todos los campos obligatorios."
                );
                return;
            }

            if (
                existenciaMinima.value.trim() === "" ||
                precioP.value.trim() === "" ||
                !Number.isFinite(
                    datosProducto.existenciaMinima
                ) ||
                !Number.isFinite(
                    datosProducto.precioP
                ) ||
                datosProducto.existenciaMinima < 0 ||
                datosProducto.precioP < 0
            ) {
                mostrarMensajeFormulario(
                    "La existencia mínima y el precio " +
                    "deben ser válidos y no negativos."
                );
                return;
            }

            if (
                esEdicion &&
                Number(idEditar) <= 0
            ) {
                mostrarMensajeFormulario(
                    "El ID del producto no es válido."
                );
                return;
            }

            if (esEdicion) {
                const confirmar = window.confirm(
                    '¿Está seguro de que desea guardar ' +
                    'los cambios del producto "' +
                    datosProducto.nombreProducto +
                    '"?'
                );

                if (!confirmar) return;
            }

            const url = esEdicion
                ? API_PRODUCTOS + "/" +
                encodeURIComponent(idEditar)
                : API_PRODUCTOS;

            const metodo =
                esEdicion ? "PUT" : "POST";

            btnGuardarProducto.disabled = true;
            btnGuardarProducto.textContent =
                "Guardando...";

            limpiarMensajeFormulario();

            try {
                const respuesta = await fetch(
                    url,
                    {
                        method: metodo,
                        credentials: "include",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(datosProducto)
                    }
                );

                const datos =
                    await leerRespuesta(respuesta);

                if (resultadoFallido(respuesta, datos)) {
                    mostrarMensajeFormulario(
                        datos.mensaje ||
                        (
                            esEdicion
                                ? "No se pudo actualizar el producto."
                                : "No se pudo registrar el producto."
                        )
                    );
                    return;
                }

                const actualizado =
                    await cargarProductos();

                if (esEdicion) {

                    modalProducto.hidden = true;
                    formProducto.reset();
                    idProductoEditar.value = "";

                    if (actualizado) {
                        mostrarMensaje(
                            datos.mensaje ||
                            "Producto actualizado correctamente.",
                            "exito"
                        );
                    }

                } else {

                    formProducto.reset();
                    idProductoEditar.value = "";

                    mostrarMensajeFormulario(
                        datos.mensaje ||
                        "Producto registrado correctamente.",
                        "exito"
                    );

                    nombreProducto.focus();
                }

            } catch (error) {
                console.error(
                    "Error al guardar producto:",
                    error
                );

                mostrarMensajeFormulario(
                    "No fue posible conectar con el servidor."
                );

            } finally {

                btnGuardarProducto.disabled = false;

                btnGuardarProducto.textContent =
                    esEdicion
                        ? "Guardar cambios"
                        : "Guardar producto";
            }
        }
    );

    // ============================================
    // FILTROS Y ACTUALIZACIÓN
    // ============================================

    buscar.addEventListener(
        "input",
        mostrarProductos
    );

    filtroTipo.addEventListener(
        "change",
        mostrarProductos
    );

    if (filtroEstado) {
        filtroEstado.addEventListener(
            "change",
            mostrarProductos
        );
    }

    document.getElementById("btnActualizar")
        .addEventListener(
            "click",
            cargarProductos
        );

    // ============================================
    // CARGA INICIAL
    // ============================================

    mostrarSucursalUsuario();
    cargarProductos();

});





