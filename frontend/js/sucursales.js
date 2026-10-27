

document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACIÓN
    // ============================================

    const API =
        "http://localhost:8080/PROYECTOWEB/api/sucursales";

    const API_USUARIOS =
        "http://localhost:8080/PROYECTOWEB/api/usuarios";

    // ============================================
    // VALIDAR SESIÓN
    // ============================================

    const guardado = sessionStorage.getItem("usuario");

    if (!guardado) {
        window.location.replace("index.html");
        return;
    }

    let usuarioActual;

    try {
        usuarioActual = JSON.parse(guardado);

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

    const rolActual = String(usuarioActual.rol || "")
        .trim()
        .toUpperCase();

    const esAdmin = rolActual === "ADMIN";
    const esEncargado = rolActual === "SUCURSAL";

    const miSucursal =
        usuarioActual.idSucursal == null
            ? null
            : Number(usuarioActual.idSucursal);

    // Solo ADMIN y SUCURSAL pueden acceder al módulo.

    if (!esAdmin && !esEncargado) {
        window.location.replace("dashboard.html");
        return;
    }

    if (
        esEncargado &&
        (!Number.isInteger(miSucursal) || miSucursal <= 0)
    ) {
        window.location.replace("dashboard.html");
        return;
    }

    // ============================================
    // ELEMENTOS HTML
    // ============================================

    const nombreCabecera =
        document.getElementById("nombreUsuario");

    const rolCabecera =
        document.getElementById("rolUsuario");

    const sucursalCabecera =
        document.getElementById("sucursalUsuario");

    const tabla =
        document.getElementById("tablaSucursales");

    const contador =
        document.getElementById("totalSucursales");

    const buscar =
        document.getElementById("buscarSucursal");

    const filtroEstado =
        document.getElementById("filtroEstado");

    const mensaje =
        document.getElementById("mensajeSucursales");

    const btnNueva =
        document.getElementById("btnNuevaSucursal");

    const btnActualizar =
        document.getElementById("btnActualizar");

    const modal =
        document.getElementById("modalSucursal");

    const tituloModal =
        document.getElementById("tituloModalSucursal");

    const form =
        document.getElementById("formSucursal");

    const idEditar =
        document.getElementById("idSucursalEditar");

    const nombreEditar =
        document.getElementById("nombreEditar");

    const direccionEditar =
        document.getElementById("direccionEditar");

    const telefonoEditar =
        document.getElementById("telefonoEditar");

    const mensajeFormulario =
        document.getElementById("mensajeFormulario");

    const btnGuardar =
        document.getElementById("btnGuardarSucursal");

    const btnCerrarModal =
        document.getElementById("btnCerrarModal");

    const btnCancelarSucursal =
        document.getElementById("btnCancelarSucursal");

    const btnCerrarSesion =
        document.getElementById("btnCerrarSesion");

    // ============================================
    // VARIABLES
    // ============================================

    let sucursales = [];
    let modoFormulario = "crear";
    let guardando = false;

    // ============================================
    // MENSAJES
    // ============================================

    function mostrarMensaje(texto, tipo = "exito") {

        if (!mensaje) return;

        mensaje.textContent = texto;

        mensaje.className = "mensaje " + tipo;
    }

    function mostrarMensajeFormulario(
        texto,
        tipo = "error"
    ) {

        if (!mensajeFormulario) return;

        mensajeFormulario.textContent = texto;

        mensajeFormulario.className =
            "mensaje-formulario " + tipo;
    }

    // ============================================
    // NOMBRE DEL ROL
    // ============================================

    function obtenerNombreRol(rol) {

        const nombres = {
            ADMIN: "Administrador",
            SUCURSAL: "Encargado de sucursal",
            VENDEDOR: "Vendedor",
            REPARTIDOR: "Repartidor"
        };

        return nombres[
            String(rol || "").toUpperCase()
        ] || "Sin rol";
    }

    // ============================================
    // PETICIONES AL BACKEND
    // ============================================

    async function peticion(url, opciones = {}) {

        let respuesta;

        try {

            respuesta = await fetch(url, {
                ...opciones,
                credentials: "include"
            });

        } catch (error) {

            throw new Error(
                "No se pudo conectar con el servidor. " +
                "Verifica que Tomcat esté ejecutándose."
            );
        }

        let datos;

        try {

            datos = await respuesta.json();

        } catch (error) {

            throw new Error(
                "El servidor no devolvió una respuesta JSON válida."
            );
        }

        if (respuesta.status === 401) {

            sessionStorage.removeItem("usuario");

            throw new Error(
                "La sesión expiró. Inicia sesión nuevamente."
            );
        }

        if (
            !respuesta.ok ||
            datos.estado === "ERROR" ||
            (
                datos.idSalida !== undefined &&
                Number(datos.idSalida) <= 0
            ) ||
            (
                datos.idSucursal !== undefined &&
                Number(datos.idSucursal) <= 0
            )
        ) {

            throw new Error(
                datos.mensaje ||
                "No se pudo completar la operación."
            );
        }

        return datos;
    }

    // ============================================
    // ENCABEZADO DEL USUARIO
    // ============================================

    if (nombreCabecera) {

        nombreCabecera.textContent =
            usuarioActual.nombreUsuario ||
            usuarioActual.usuario ||
            "Usuario";
    }

    if (rolCabecera) {

        rolCabecera.textContent =
            obtenerNombreRol(rolActual);
    }

    // ============================================
    // MOSTRAR SUCURSAL EN EL ENCABEZADO
    // ============================================

    async function mostrarSucursalCabecera() {

        if (!sucursalCabecera) return;

        if (
            usuarioActual.idSucursal === null ||
            usuarioActual.idSucursal === undefined ||
            String(usuarioActual.idSucursal).trim() === ""
        ) {

            sucursalCabecera.textContent =
                "Sin sucursal asignada";

            return;
        }

        const id = Number(usuarioActual.idSucursal);

        if (!Number.isInteger(id) || id <= 0) {

            sucursalCabecera.textContent =
                "Sucursal no disponible";

            return;
        }

        sucursalCabecera.textContent =
            "Cargando sucursal...";

        try {

            const datos = await peticion(
                API + "/" + encodeURIComponent(id)
            );

            if (
                !datos.sucursal ||
                !datos.sucursal.nombreSucursal
            ) {

                throw new Error(
                    "Sucursal no encontrada"
                );
            }

            sucursalCabecera.textContent =
                "Sucursal: " +
                datos.sucursal.nombreSucursal;

        } catch (error) {

            console.error(
                "Error consultando sucursal:",
                error
            );

            sucursalCabecera.textContent =
                "Sucursal #" + id;
        }
    }

    // ============================================
    // PERMISOS VISUALES
    // ============================================

    if (!esAdmin) {

        if (btnNueva) {
            btnNueva.hidden = true;
        }

        const descripcion =
            document.getElementById(
                "descripcionSucursales"
            );

        if (descripcion) {

            descripcion.textContent =
                "Consulta la información de tu sucursal asignada.";
        }
    }

    // Los permisos reales también se validan
    // en SucursalController.java.

    // ============================================
    // AGREGAR CELDA A LA TABLA
    // ============================================

    function agregarCelda(fila, valor) {

        const td = document.createElement("td");

        td.textContent =
            valor === null ||
            valor === undefined ||
            valor === ""
                ? "—"
                : String(valor);

        fila.appendChild(td);

        return td;
    }

    // ============================================
    // FORMATEAR FECHA
    // ============================================

    function formatearFecha(valor) {

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return "—";
        }

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleDateString("es-GT");
    }

    // ============================================
    // CREAR BOTONES
    // ============================================

    function crearBoton(texto, clase, accion) {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = clase;
        boton.textContent = texto;

        boton.addEventListener("click", function () {
            accion(boton);
        });

        return boton;
    }

    // ============================================
    // DETERMINAR ESTADO DE SUCURSAL
    // ============================================

    function obtenerActivo(sucursal) {

        const valor =
            sucursal.activo !== undefined
                ? sucursal.activo
                : sucursal.estado;

        return (
            valor === 1 ||
            valor === true ||
            String(valor).toUpperCase() === "1" ||
            String(valor).toUpperCase() === "ACTIVO"
        );
    }

    // ============================================
    // CARGAR SUCURSALES DESDE ORACLE
    // ============================================

    async function cargarSucursales() {

        if (!tabla || !contador) return;

        tabla.innerHTML = `
            <tr>
                <td colspan="7" class="sin-datos">
                    Cargando sucursales...
                </td>
            </tr>
        `;

        contador.textContent = "0 sucursales";

        mostrarMensaje("");

        try {

            let lista;

            if (esEncargado) {

                // El encargado solo consulta
                // su sucursal asignada.

                const datos = await peticion(
                    API + "/" +
                    encodeURIComponent(miSucursal)
                );

                if (!datos.sucursal) {

                    throw new Error(
                        "No se encontró la sucursal asignada."
                    );
                }

                lista = [datos.sucursal];

            } else {

                // ADMIN:
                // Consulta activas e inactivas.

                const datos = await peticion(
                    API + "/todos"
                );

                if (!Array.isArray(datos.sucursales)) {

                    throw new Error(
                        "El servidor no devolvió una lista de sucursales."
                    );
                }

                lista = datos.sucursales;
            }

            sucursales = lista;

            mostrarSucursales();

        } catch (error) {

            console.error(
                "Error al cargar sucursales:",
                error
            );

            sucursales = [];

            tabla.innerHTML = `
                <tr>
                    <td colspan="7" class="sin-datos">
                        No se pudieron cargar las sucursales.
                    </td>
                </tr>
            `;

            mostrarMensaje(
                error.message,
                "error"
            );
        }
    }

    // ============================================
    // MOSTRAR SUCURSALES Y APLICAR FILTROS
    // ============================================

    function mostrarSucursales() {

        if (!tabla || !contador) return;

        const texto = buscar
            ? buscar.value.trim().toLowerCase()
            : "";

        const estado = filtroEstado
            ? filtroEstado.value
            : "todos";

        const filtradas = sucursales.filter(
            function (s) {

                const nombre = String(
                    s.nombreSucursal || ""
                ).toLowerCase();

                const direccion = String(
                    s.direccion || ""
                ).toLowerCase();

                const telefono = String(
                    s.telefono || ""
                ).toLowerCase();

                const id = String(
                    s.idSucursal || ""
                );

                const coincideBusqueda =
                    nombre.includes(texto) ||
                    direccion.includes(texto) ||
                    telefono.includes(texto) ||
                    id.includes(texto);

                const activo = obtenerActivo(s);

                const coincideEstado =
                    estado === "todos" ||
                    (estado === "1" && activo) ||
                    (estado === "0" && !activo);

                return (
                    coincideBusqueda &&
                    coincideEstado
                );
            }
        );

        contador.textContent =
            filtradas.length +
            (
                filtradas.length === 1
                    ? " sucursal"
                    : " sucursales"
            );

        tabla.replaceChildren();

        if (filtradas.length === 0) {

            tabla.innerHTML = `
                <tr>
                    <td colspan="7" class="sin-datos">
                        No se encontraron sucursales.
                    </td>
                </tr>
            `;

            return;
        }

        filtradas.forEach(function (s) {

            const fila =
                document.createElement("tr");

            // ID
            agregarCelda(
                fila,
                s.idSucursal
            );

            // NOMBRE
            agregarCelda(
                fila,
                s.nombreSucursal
            );

            // DIRECCIÓN
            agregarCelda(
                fila,
                s.direccion
            );

            // TELÉFONO
            agregarCelda(
                fila,
                s.telefono
            );

            // ESTADO
            const activo = obtenerActivo(s);

            const tdEstado =
                document.createElement("td");

            const etiqueta =
                document.createElement("span");

            etiqueta.className =
                "estado " +
                (
                    activo
                        ? "estado-activo"
                        : "estado-inactivo"
                );

            etiqueta.textContent =
                activo
                    ? "Activa"
                    : "Desactivada";

            tdEstado.appendChild(etiqueta);

            fila.appendChild(tdEstado);

            // FECHA
            agregarCelda(
                fila,
                formatearFecha(s.fechaCreacion)
            );

            // ACCIONES
            const tdAcciones =
                document.createElement("td");

            const acciones =
                document.createElement("div");

            acciones.className = "acciones";

            if (esAdmin) {

                if (activo) {

                    // EDITAR
                    acciones.appendChild(
                        crearBoton(
                            "Editar",
                            "btn-editar",
                            function () {
                                abrirModalEditar(s);
                            }
                        )
                    );

                    // DESACTIVAR
                    acciones.appendChild(
                        crearBoton(
                            "Desactivar",
                            "btn-desactivar",
                            function (boton) {
                                cambiarEstado(
                                    s,
                                    false,
                                    boton
                                );
                            }
                        )
                    );

                } else {

                    // REACTIVAR
                    acciones.appendChild(
                        crearBoton(
                            "Reactivar",
                            "btn-reactivar",
                            function (boton) {
                                cambiarEstado(
                                    s,
                                    true,
                                    boton
                                );
                            }
                        )
                    );
                }

            } else {

                const textoConsulta =
                    document.createElement("span");

                textoConsulta.className =
                    "solo-lectura";

                textoConsulta.textContent =
                    "Solo consulta";

                acciones.appendChild(
                    textoConsulta
                );
            }

            tdAcciones.appendChild(acciones);

            fila.appendChild(tdAcciones);

            tabla.appendChild(fila);
        });
    }

    // ============================================
    // ABRIR MODAL: NUEVA SUCURSAL
    // ============================================

    function abrirModalNuevo() {

        if (!esAdmin) {

            mostrarMensaje(
                "No tiene permisos para crear sucursales.",
                "error"
            );

            return;
        }

        modoFormulario = "crear";

        form.reset();

        idEditar.value = "";

        tituloModal.textContent =
            "Registrar nueva sucursal";

        btnGuardar.textContent =
            "Registrar sucursal";

        mostrarMensajeFormulario("");

        modal.hidden = false;

        nombreEditar.focus();
    }

    // ============================================
    // ABRIR MODAL: EDITAR SUCURSAL
    // ============================================

    function abrirModalEditar(s) {

        if (!esAdmin) return;

        if (!obtenerActivo(s)) {

            mostrarMensaje(
                "No se puede editar una sucursal desactivada.",
                "error"
            );

            return;
        }

        modoFormulario = "editar";

        form.reset();

        idEditar.value = s.idSucursal;

        nombreEditar.value =
            s.nombreSucursal || "";

        direccionEditar.value =
            s.direccion || "";

        telefonoEditar.value =
            s.telefono || "";

        tituloModal.textContent =
            "Editar sucursal";

        btnGuardar.textContent =
            "Guardar cambios";

        mostrarMensajeFormulario("");

        modal.hidden = false;

        nombreEditar.focus();
    }

    // ============================================
    // CERRAR MODAL
    // ============================================

    function cerrarModal() {

        if (guardando) return;

        modal.hidden = true;

        form.reset();

        idEditar.value = "";

        mostrarMensajeFormulario("");
    }

    // ============================================
    // REGISTRAR / ACTUALIZAR SUCURSAL
    // ============================================

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (!esAdmin) {

                mostrarMensajeFormulario(
                    "No tiene permisos para modificar sucursales."
                );

                return;
            }

            if (guardando) return;

            const nombre =
                nombreEditar.value.trim();

            const direccion =
                direccionEditar.value.trim();

            const telefono =
                telefonoEditar.value.trim();

            if (!nombre) {

                mostrarMensajeFormulario(
                    "Debe ingresar el nombre de la sucursal."
                );

                return;
            }

            const esNuevo =
                modoFormulario === "crear";

            const id =
                Number(idEditar.value);

            if (
                !esNuevo &&
                (
                    !Number.isInteger(id) ||
                    id <= 0
                )
            ) {

                mostrarMensajeFormulario(
                    "ID de sucursal no válido."
                );

                return;
            }

            const pregunta = esNuevo
                ? '¿Registrar la sucursal "' +
                  nombre + '"?'
                : '¿Guardar los cambios de "' +
                  nombre + '"?';

            if (!window.confirm(pregunta)) {
                return;
            }

            guardando = true;

            btnGuardar.disabled = true;

            btnGuardar.textContent = esNuevo
                ? "Registrando..."
                : "Guardando...";

            mostrarMensajeFormulario("");

            try {

                const url = esNuevo
                    ? API
                    : API + "/" +
                      encodeURIComponent(id);

                const metodo = esNuevo
                    ? "POST"
                    : "PUT";

                const datos = await peticion(
                    url,
                    {
                        method: metodo,

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            nombreSucursal: nombre,
                            direccion: direccion,
                            telefono: telefono
                        })
                    }
                );

                modal.hidden = true;

                form.reset();

                if (buscar) {
                    buscar.value = "";
                }

                if (filtroEstado) {
                    filtroEstado.value = "1";
                }

                await cargarSucursales();

                mostrarMensaje(
                    datos.mensaje ||
                    (
                        esNuevo
                            ? "Sucursal registrada correctamente."
                            : "Sucursal actualizada correctamente."
                    )
                );

            } catch (error) {

                mostrarMensajeFormulario(
                    error.message
                );

                modal.hidden = false;

            } finally {

                guardando = false;

                btnGuardar.disabled = false;

                btnGuardar.textContent = esNuevo
                    ? "Registrar sucursal"
                    : "Guardar cambios";
            }
        }
    );

    // ============================================
    // DESACTIVAR / REACTIVAR SUCURSAL
    // ============================================

    async function cambiarEstado(
        s,
        reactivar,
        boton
    ) {

        if (!esAdmin) {

            mostrarMensaje(
                "No tiene permisos para esta operación.",
                "error"
            );

            return;
        }

        const accion = reactivar
            ? "reactivar"
            : "desactivar";

        const pregunta =
            "¿Desea " +
            accion +
            ' la sucursal "' +
            s.nombreSucursal +
            '"?';

        if (!window.confirm(pregunta)) {
            return;
        }

        const textoOriginal =
            boton.textContent;

        boton.disabled = true;

        boton.textContent = reactivar
            ? "Reactivando..."
            : "Desactivando...";

        try {

            const url =
                API + "/" +
                encodeURIComponent(
                    s.idSucursal
                ) +
                (
                    reactivar
                        ? "/reactivar"
                        : ""
                );

            const datos = await peticion(
                url,
                {
                    method: reactivar
                        ? "PUT"
                        : "DELETE"
                }
            );

            await cargarSucursales();

            mostrarMensaje(
                datos.mensaje ||
                "Operación realizada correctamente."
            );

        } catch (error) {

            mostrarMensaje(
                error.message,
                "error"
            );

        } finally {

            boton.disabled = false;

            boton.textContent =
                textoOriginal;
        }
    }

    // ============================================
    // EVENTOS
    // ============================================

    if (btnNueva) {

        btnNueva.addEventListener(
            "click",
            abrirModalNuevo
        );
    }

    if (btnActualizar) {

        btnActualizar.addEventListener(
            "click",
            cargarSucursales
        );
    }

    if (buscar) {

        buscar.addEventListener(
            "input",
            mostrarSucursales
        );
    }

    if (filtroEstado) {

        filtroEstado.addEventListener(
            "change",
            mostrarSucursales
        );
    }

    if (btnCerrarModal) {

        btnCerrarModal.addEventListener(
            "click",
            cerrarModal
        );
    }

    if (btnCancelarSucursal) {

        btnCancelarSucursal.addEventListener(
            "click",
            cerrarModal
        );
    }

    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {
                    cerrarModal();
                }
            }
        );
    }

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal &&
                !modal.hidden
            ) {
                cerrarModal();
            }
        }
    );

    // ============================================
    // CERRAR SESIÓN
    // ============================================

    if (btnCerrarSesion) {

        btnCerrarSesion.addEventListener(
            "click",
            async function () {

                try {

                    await peticion(
                        API_USUARIOS + "/logout",
                        {
                            method: "POST"
                        }
                    );

                    sessionStorage.removeItem(
                        "usuario"
                    );

                    window.location.replace(
                        "index.html"
                    );

                } catch (error) {

                    mostrarMensaje(
                        "No se pudo cerrar sesión: " +
                        error.message,
                        "error"
                    );
                }
            }
        );
    }

    // ============================================
    // CARGA INICIAL
    // ============================================

    mostrarSucursalCabecera();

    cargarSucursales();

});

