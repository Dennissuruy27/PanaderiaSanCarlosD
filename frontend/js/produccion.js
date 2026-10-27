
document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACION DE API
    // ============================================

    const API_PRODUCCION =
        "http://localhost:8080/PROYECTOWEB/api/produccion";

    const API_PRODUCTOS =
        "http://localhost:8080/PROYECTOWEB/api/productos";

    const API_SUCURSALES =
        "http://localhost:8080/PROYECTOWEB/api/sucursales";

    const API_LOGOUT =
        "http://localhost:8080/PROYECTOWEB/api/usuarios/logout";


    // ============================================
    // ELEMENTOS DEL HTML
    // ============================================

    const tabla =
        document.getElementById("tablaProducciones");

    const contador =
        document.getElementById("contadorProducciones");

    const buscar =
        document.getElementById("buscarProduccion");

    const filtroEstado =
        document.getElementById("filtroEstado");

    const mensaje =
        document.getElementById("mensajeProduccion");

    const totalOrdenes =
        document.getElementById("totalOrdenes");

    const totalPendientes =
        document.getElementById("totalPendientes");

    const totalEnProceso =
        document.getElementById("totalEnProceso");

    const totalCompletadas =
        document.getElementById("totalCompletadas");

    const btnNuevaProduccion =
        document.getElementById("btnNuevaProduccion");

    const btnActualizar =
        document.getElementById("btnActualizar");

    const modalProduccion =
        document.getElementById("modalProduccion");

    const btnCerrarModal =
        document.getElementById("btnCerrarModal");

    const btnCancelarModal =
        document.getElementById("btnCancelarModal");

    const formProduccion =
        document.getElementById("formProduccion");

    const productoProduccion =
        document.getElementById("productoProduccion");

    const cantidadProduccion =
        document.getElementById("cantidadProduccion");

    const btnGuardarProduccion =
        document.getElementById("btnGuardarProduccion");

    const mensajeFormulario =
        document.getElementById("mensajeFormulario");

    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const rolUsuario =
        document.getElementById("rolUsuario");

    const sucursalUsuario =
        document.getElementById("sucursalUsuario");

    const btnCerrarSesion =
        document.getElementById("btnCerrarSesion");


    // ============================================
    // VARIABLES
    // ============================================

    let producciones = [];
    let productos = [];
    let usuarioActual = null;


    // ============================================
    // VERIFICAR SESION
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
            throw new Error("Sesion invalida");
        }

    } catch (error) {

        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return;
    }

    const rolActual = String(
        usuarioActual.rol || ""
    ).trim().toUpperCase();

    const esAdmin = rolActual === "ADMIN";

    if (!esAdmin) {

        alert(
            "No tiene permisos para acceder a Produccion."
        );

        window.location.replace("dashboard.html");
        return;
    }


    // ============================================
    // INFORMACION DEL USUARIO
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
    // MOSTRAR SUCURSAL DEL USUARIO
    // ============================================

    async function mostrarSucursalUsuario() {

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
                    credentials: "include"
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "HTTP " + respuesta.status
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

            console.error(error);

            sucursalUsuario.textContent =
                "Sucursal #" + id;
        }
    }


    // ============================================
    // CERRAR SESION
    // ============================================

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
                        "No se pudo cerrar sesion"
                    );
                }

                sessionStorage.removeItem("usuario");

                window.location.replace(
                    "index.html"
                );

            } catch (error) {

                console.error(error);

                alert(
                    "No se pudo cerrar la sesion."
                );

                btnCerrarSesion.disabled = false;
            }
        }
    );


    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================

    function campo(objeto, ...nombres) {

        for (const nombre of nombres) {

            if (
                objeto[nombre] !== undefined &&
                objeto[nombre] !== null
            ) {
                return objeto[nombre];
            }
        }

        return "";
    }


    function normalizarEstado(estado) {

        return String(estado || "")
            .trim()
            .toUpperCase()
            .replace(/_/g, " ")
            .replace(/\s+/g, " ");
    }


    function esUno(valor) {

        return valor === 1 ||
            valor === "1" ||
            valor === true;
    }


    // ============================================
    // MOSTRAR MENSAJES
    // ============================================

    function mostrarMensaje(
        texto,
        tipo = "exito"
    ) {

        mensaje.textContent = texto;

        mensaje.className =
            "mensaje " + tipo;

        mensaje.hidden = false;

        if (tipo === "error") {

            mensaje.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }


    function mostrarMensajeFormulario(
        texto,
        tipo = "error"
    ) {

        mensajeFormulario.textContent = texto;

        mensajeFormulario.className =
            "mensaje-formulario " + tipo;

        mensajeFormulario.hidden = false;
    }


    function limpiarMensajeFormulario() {

        mensajeFormulario.textContent = "";

        mensajeFormulario.className =
            "mensaje-formulario";

        mensajeFormulario.hidden = false;
    }


    // ============================================
    // LEER RESPUESTA DEL SERVIDOR
    // ============================================

    async function leerRespuesta(respuesta) {

        const texto = await respuesta.text();

        if (!texto.trim()) {
            return {};
        }

        try {

            return JSON.parse(texto);

        } catch (error) {

            console.error(
                "Respuesta no JSON del servidor:",
                texto
            );

            throw new Error(
                "El servidor devolvio una respuesta " +
                "que no tiene formato JSON valido. " +
                "HTTP " + respuesta.status
            );
        }
    }


    // ============================================
    // IDENTIFICAR RESPUESTA FALLIDA
    // ============================================

    function respuestaFallida(respuesta, datos) {

        return !respuesta.ok ||
            datos.estado === "ERROR" ||
            (
                datos.idSalida !== undefined &&
                Number(datos.idSalida) <= 0
            );
    }


    // ============================================
    // VALIDAR SESION HTTP
    // ============================================

    function manejarSesionHTTP(respuesta) {

        if (respuesta.status === 401) {

            sessionStorage.removeItem("usuario");

            window.location.replace(
                "index.html"
            );

            return true;
        }

        return false;
    }


    // ============================================
    // CARGAR PRODUCCIONES
    // ============================================

    async function cargarProducciones() {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="sin-datos">
                    Cargando producciones...
                </td>
            </tr>
        `;

        try {

            const respuesta = await fetch(
                API_PRODUCCION,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (manejarSesionHTTP(respuesta)) {
                return false;
            }

            if (!respuesta.ok) {

                throw new Error(
                    "HTTP " + respuesta.status
                );
            }

            const datos = await respuesta.json();

            if (Array.isArray(datos)) {

                producciones = datos;

            } else if (
                Array.isArray(datos.producciones)
            ) {

                producciones = datos.producciones;

            } else {

                throw new Error(
                    "Formato de producciones no reconocido"
                );
            }

            actualizarResumen();
            mostrarProducciones();

            return true;

        } catch (error) {

            console.error(
                "Error al cargar producciones:",
                error
            );

            producciones = [];

            actualizarResumen();

            contador.textContent = "0 ordenes";

            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se pudieron cargar las producciones.
                    </td>
                </tr>
            `;

            mostrarMensaje(
                "Verifica que Tomcat este funcionando " +
                "y que /api/produccion responda correctamente.",
                "error"
            );

            return false;
        }
    }


    // ============================================
    // ACTUALIZAR RESUMEN
    // ============================================

    function actualizarResumen() {

        totalOrdenes.textContent =
            producciones.length;

        totalPendientes.textContent =
            producciones.filter(p =>
                normalizarEstado(
                    campo(p, "estado", "ESTADO")
                ) === "PENDIENTE"
            ).length;

        totalEnProceso.textContent =
            producciones.filter(p =>
                normalizarEstado(
                    campo(p, "estado", "ESTADO")
                ) === "EN PROCESO"
            ).length;

        totalCompletadas.textContent =
            producciones.filter(p =>
                normalizarEstado(
                    campo(p, "estado", "ESTADO")
                ) === "COMPLETADA"
            ).length;
    }


    // ============================================
    // MOSTRAR PRODUCCIONES
    // ============================================

    function mostrarProducciones() {

        const texto =
            buscar.value.trim().toLowerCase();

        const estadoFiltro =
            normalizarEstado(filtroEstado.value);

        const filtradas = producciones.filter(
            produccion => {

                const id = String(
                    campo(
                        produccion,
                        "idProduccion",
                        "ID_PRODUCCION"
                    )
                );

                const nombre = String(
                    campo(
                        produccion,
                        "nombreProducto",
                        "NOMBRE_PRODUCTO"
                    )
                ).toLowerCase();

                const estado = normalizarEstado(
                    campo(
                        produccion,
                        "estado",
                        "ESTADO"
                    )
                );

                return (
                    (
                        id.includes(texto) ||
                        nombre.includes(texto)
                    ) &&
                    (
                        !estadoFiltro ||
                        estado === estadoFiltro
                    )
                );
            }
        );

        contador.textContent =
            filtradas.length + " ordenes";

        tabla.innerHTML = "";

        if (filtradas.length === 0) {

            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se encontraron producciones.
                    </td>
                </tr>
            `;

            return;
        }

        filtradas.forEach(produccion => {

            const id = campo(
                produccion,
                "idProduccion",
                "ID_PRODUCCION"
            );

            const nombre = campo(
                produccion,
                "nombreProducto",
                "NOMBRE_PRODUCTO"
            );

            const cantidad = campo(
                produccion,
                "cantidadP",
                "CANTIDAD_P"
            );

            const unidad = campo(
                produccion,
                "unidadMedida",
                "UNIDAD_MEDIDA"
            );

            const fecha = campo(
                produccion,
                "fecha",
                "FECHA"
            );

            const responsable = campo(
                produccion,
                "nombreUsuario",
                "NOMBRE_USUARIO"
            );

            const estado = normalizarEstado(
                campo(
                    produccion,
                    "estado",
                    "ESTADO"
                )
            );

            const fila =
                document.createElement("tr");


            // AGREGAR CELDAS

            function agregarCelda(valor) {

                const td =
                    document.createElement("td");

                td.textContent =
                    valor === "" ||
                        valor === null
                        ? "—"
                        : valor;

                fila.appendChild(td);

                return td;
            }

            agregarCelda(id);
            agregarCelda(nombre);
            agregarCelda(cantidad);
            agregarCelda(unidad);
            agregarCelda(fecha);
            agregarCelda(responsable);


            // ====================================
            // ESTADO
            // ====================================

            const tdEstado =
                document.createElement("td");

            const etiqueta =
                document.createElement("span");

            etiqueta.className = "estado";

            switch (estado) {

                case "PENDIENTE":

                    etiqueta.classList.add(
                        "estado-pendiente"
                    );

                    etiqueta.textContent =
                        "Pendiente";

                    break;

                case "EN PROCESO":

                    etiqueta.classList.add(
                        "estado-proceso"
                    );

                    etiqueta.textContent =
                        "En proceso";

                    break;

                case "COMPLETADA":

                    etiqueta.classList.add(
                        "estado-completada"
                    );

                    etiqueta.textContent =
                        "Completada";

                    break;

                case "CANCELADA":

                    etiqueta.classList.add(
                        "estado-cancelada"
                    );

                    etiqueta.textContent =
                        "Cancelada";

                    break;

                default:

                    etiqueta.textContent =
                        estado || "Sin estado";
            }

            tdEstado.appendChild(etiqueta);

            fila.appendChild(tdEstado);


            // ====================================
            // BOTONES DE ACCIONES
            // ====================================

            const tdAcciones =
                document.createElement("td");

            const contenedor =
                document.createElement("div");

            contenedor.className =
                "acciones-tabla";


            function crearBoton(
                textoBoton,
                clase,
                accion
            ) {

                const boton =
                    document.createElement("button");

                boton.type = "button";

                boton.textContent =
                    textoBoton;

                boton.className =
                    "btn-accion " + clase;

                boton.addEventListener(
                    "click",
                    () => {

                        cambiarEstado(
                            id,
                            accion,
                            nombre,
                            boton
                        );
                    }
                );

                contenedor.appendChild(boton);
            }


            // PENDIENTE

            if (
                Number(id) > 0 &&
                estado === "PENDIENTE"
            ) {

                crearBoton(
                    "Iniciar",
                    "btn-iniciar",
                    "iniciar"
                );

                crearBoton(
                    "Cancelar",
                    "btn-cancelar-orden",
                    "cancelar"
                );
            }


            // EN PROCESO

            if (
                Number(id) > 0 &&
                estado === "EN PROCESO"
            ) {

                crearBoton(
                    "Completar",
                    "btn-completar",
                    "completar"
                );

                crearBoton(
                    "Cancelar",
                    "btn-cancelar-orden",
                    "cancelar"
                );
            }


            if (contenedor.children.length === 0) {

                tdAcciones.textContent = "—";

            } else {

                tdAcciones.appendChild(
                    contenedor
                );
            }

            fila.appendChild(tdAcciones);

            tabla.appendChild(fila);
        });
    }


    // ============================================
    // CAMBIAR ESTADO DE PRODUCCION
    // ============================================

    async function cambiarEstado(
        id,
        accion,
        nombre,
        boton
    ) {

        const mensajes = {
            iniciar: "iniciar",
            completar: "completar",
            cancelar: "cancelar"
        };

        if (!mensajes[accion]) {
            return;
        }

        let advertencia =
            `¿Esta seguro de que desea ${mensajes[accion]} ` +
            `la produccion #${id} de "${nombre}"?`;

        if (accion === "completar") {

            advertencia +=
                "\n\nEsta accion descontara las materias primas " +
                "y aumentara el inventario del producto terminado.";
        }

        if (!window.confirm(advertencia)) {
            return;
        }

        boton.disabled = true;

        const textoOriginal =
            boton.textContent;

        boton.textContent =
            "Procesando...";

        try {

            const respuesta = await fetch(
                API_PRODUCCION + "/" +
                encodeURIComponent(id) + "/" +
                accion,
                {
                    method: "PUT",
                    credentials: "include"
                }
            );

            if (manejarSesionHTTP(respuesta)) {
                return;
            }

            // Leer el mensaje que viene de Oracle
            // a traves del backend Java.

            const datos =
                await leerRespuesta(respuesta);

            console.log(
                "Respuesta de produccion:",
                datos
            );

            // ====================================
            // SI LA OPERACION FALLO
            // ====================================

            if (
                respuestaFallida(
                    respuesta,
                    datos
                )
            ) {

                const mensajeError =
                    datos.mensaje ||
                    "No se pudo cambiar el estado " +
                    "de produccion.";

                mostrarMensaje(
                    mensajeError,
                    "error"
                );

                // No actualizar el inventario
                // ni cambiar el estado visual.

                return;
            }

            // ====================================
            // SI LA OPERACION FUE EXITOSA
            // ====================================

            const actualizado =
                await cargarProducciones();

            if (actualizado) {

                mostrarMensaje(
                    datos.mensaje ||
                    "Produccion actualizada correctamente.",
                    "exito"
                );
            }

        } catch (error) {

            console.error(
                "Error al cambiar estado:",
                error
            );

            mostrarMensaje(
                error.message ||
                "No fue posible conectar con el servidor.",
                "error"
            );

        } finally {

            boton.disabled = false;

            boton.textContent =
                textoOriginal;
        }
    }


    // ============================================
    // CARGAR PRODUCTOS TERMINADOS
    // ============================================

    async function cargarProductosTerminados() {

        productoProduccion.innerHTML = `
            <option value="">
                Cargando productos...
            </option>
        `;

        productoProduccion.disabled = true;

        try {

            const respuesta = await fetch(
                API_PRODUCTOS + "/todos",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (manejarSesionHTTP(respuesta)) {
                return;
            }

            if (!respuesta.ok) {

                throw new Error(
                    "HTTP " + respuesta.status
                );
            }

            const datos =
                await respuesta.json();

            if (Array.isArray(datos)) {

                productos = datos;

            } else if (
                Array.isArray(datos.productos)
            ) {

                productos = datos.productos;

            } else {

                throw new Error(
                    "Formato de productos no reconocido"
                );
            }

            const terminados = productos.filter(
                producto => {

                    const tipo = String(
                        campo(
                            producto,
                            "tipoProducto",
                            "TIPO_PRODUCTO"
                        )
                    )
                        .toUpperCase()
                        .replace(/[\s_-]/g, "");

                    const activo = campo(
                        producto,
                        "activo",
                        "ACTIVO"
                    );

                    const aprobado = campo(
                        producto,
                        "aprobado",
                        "APROBADO"
                    );

                    return (
                        tipo === "PRODUCTOTERMINADO" &&
                        esUno(activo) &&
                        esUno(aprobado)
                    );
                }
            );

            productoProduccion.innerHTML = `
                <option value="">
                    Seleccione un producto
                </option>
            `;

            terminados.forEach(producto => {

                const id = campo(
                    producto,
                    "idProducto",
                    "ID_PRODUCTO"
                );

                const nombre = campo(
                    producto,
                    "nombreProducto",
                    "NOMBRE_PRODUCTO"
                );

                if (Number(id) <= 0) {
                    return;
                }

                const opcion =
                    document.createElement("option");

                opcion.value = id;

                opcion.textContent = nombre;

                productoProduccion.appendChild(
                    opcion
                );
            });

            if (terminados.length === 0) {

                mostrarMensajeFormulario(
                    "No hay productos terminados " +
                    "activos y aprobados."
                );
            }

        } catch (error) {

            console.error(error);

            productoProduccion.innerHTML = `
                <option value="">
                    No se pudieron cargar los productos
                </option>
            `;

            mostrarMensajeFormulario(
                "No se pudieron cargar " +
                "los productos terminados."
            );

        } finally {

            productoProduccion.disabled = false;
        }
    }


    // ============================================
    // MODAL NUEVA PRODUCCION
    // ============================================

    async function abrirModalProduccion() {

        formProduccion.reset();

        limpiarMensajeFormulario();

        modalProduccion.hidden = false;

        await cargarProductosTerminados();
    }


    function cerrarModalProduccion() {

        if (btnGuardarProduccion.disabled) {
            return;
        }

        modalProduccion.hidden = true;

        formProduccion.reset();

        limpiarMensajeFormulario();
    }


    btnNuevaProduccion.addEventListener(
        "click",
        abrirModalProduccion
    );

    btnCerrarModal.addEventListener(
        "click",
        cerrarModalProduccion
    );

    btnCancelarModal.addEventListener(
        "click",
        cerrarModalProduccion
    );


    modalProduccion.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modalProduccion
            ) {

                cerrarModalProduccion();
            }
        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                !modalProduccion.hidden
            ) {

                cerrarModalProduccion();
            }
        }
    );


    // ============================================
    // REGISTRAR NUEVA PRODUCCION
    // ============================================

    formProduccion.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const idProducto = Number(
                productoProduccion.value
            );

            const cantidadP = Number(
                cantidadProduccion.value
            );

            // VALIDAR PRODUCTO

            if (
                !Number.isInteger(idProducto) ||
                idProducto <= 0
            ) {

                mostrarMensajeFormulario(
                    "Seleccione un producto terminado valido."
                );

                return;
            }

            // VALIDAR CANTIDAD

            if (
                cantidadProduccion.value.trim() === "" ||
                !Number.isFinite(cantidadP) ||
                cantidadP <= 0
            ) {

                mostrarMensajeFormulario(
                    "Ingrese una cantidad mayor que cero."
                );

                return;
            }

            // DATOS ENVIADOS AL BACKEND

            const datosProduccion = {
                idProducto: idProducto,
                cantidadP: cantidadP
            };

            btnGuardarProduccion.disabled = true;

            btnGuardarProduccion.textContent =
                "Registrando...";

            limpiarMensajeFormulario();

            try {

                const respuesta = await fetch(
                    API_PRODUCCION,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(
                            datosProduccion
                        )
                    }
                );

                if (manejarSesionHTTP(respuesta)) {
                    return;
                }

                const datos =
                    await leerRespuesta(respuesta);

                if (
                    respuestaFallida(
                        respuesta,
                        datos
                    )
                ) {

                    mostrarMensajeFormulario(
                        datos.mensaje ||
                        "No se pudo registrar la produccion."
                    );

                    return;
                }

                const actualizado =
                    await cargarProducciones();

                if (actualizado) {

                    modalProduccion.hidden = true;

                    formProduccion.reset();

                    mostrarMensaje(
                        datos.mensaje ||
                        "Orden de produccion registrada correctamente.",
                        "exito"
                    );

                } else {

                    mostrarMensajeFormulario(
                        "La orden fue registrada, pero no " +
                        "se pudo actualizar el listado. " +
                        "Intente actualizar la pagina.",
                        "exito"
                    );
                }

            } catch (error) {

                console.error(
                    "Error al registrar produccion:",
                    error
                );

                mostrarMensajeFormulario(
                    error.message ||
                    "No fue posible conectar con el servidor."
                );

            } finally {

                btnGuardarProduccion.disabled = false;

                btnGuardarProduccion.textContent =
                    "Registrar producción";
            }
        }
    );


    // ============================================
    // FILTROS Y ACTUALIZACION
    // ============================================

    buscar.addEventListener(
        "input",
        mostrarProducciones
    );

    filtroEstado.addEventListener(
        "change",
        mostrarProducciones
    );


    btnActualizar.addEventListener(
        "click",
        async function () {

            mensaje.textContent = "";

            await cargarProducciones();
        }
    );


    // ============================================
    // CARGA INICIAL
    // ============================================

    mostrarSucursalUsuario();

    cargarProducciones();

});

