
document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACIÓN DE API
    // ============================================

    const API = "http://localhost:8080/PROYECTOWEB/api/usuarios";
    const API_SUCURSALES = "http://localhost:8080/PROYECTOWEB/api/sucursales";

    // ============================================
    // VALIDAR SESIÓN
    // ============================================

    const usuarioGuardado = sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
        window.location.replace("index.html");
        return;
    }

    let usuarioActual;

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

    const esAdmin = rolActual === "ADMIN";
    const esEncargado = rolActual === "SUCURSAL";

    const miSucursal = usuarioActual.idSucursal == null
        ? null
        : Number(usuarioActual.idSucursal);

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
    // ELEMENTOS DEL ENCABEZADO
    // ============================================

    const nombreCabecera = document.getElementById("nombreUsuario");
    const rolCabecera = document.getElementById("rolUsuario");
    const sucursalCabecera = document.getElementById("sucursalUsuario");

    const nombresRoles = {
        ADMIN: "Administrador",
        SUCURSAL: "Encargado de sucursal",
        VENDEDOR: "Vendedor",
        REPARTIDOR: "Repartidor"
    };

    function obtenerNombreRol(rol) {
        const clave = String(rol || "").toUpperCase();
        return nombresRoles[clave] || clave || "Sin rol";
    }

    if (nombreCabecera) {
        nombreCabecera.textContent =
            usuarioActual.nombreUsuario ||
            usuarioActual.usuario ||
            "Usuario";
    }

    if (rolCabecera) {
        rolCabecera.textContent = obtenerNombreRol(rolActual);
    }

    async function mostrarSucursalUsuario() {

        if (!sucursalCabecera) return;

        const id = usuarioActual.idSucursal;

        if (id === null || id === undefined || String(id).trim() === "") {
            sucursalCabecera.textContent = "Sin sucursal asignada";
            return;
        }

        const numero = Number(id);

        if (!Number.isInteger(numero) || numero <= 0) {
            sucursalCabecera.textContent = "Sucursal no disponible";
            return;
        }

        sucursalCabecera.textContent = "Cargando sucursal...";

        try {
            const respuesta = await fetch(
                API_SUCURSALES + "/" + encodeURIComponent(numero),
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (!respuesta.ok) {
                throw new Error("HTTP " + respuesta.status);
            }

            const datos = await respuesta.json();

            if (!datos.sucursal || !datos.sucursal.nombreSucursal) {
                throw new Error("Sucursal no encontrada");
            }

            sucursalCabecera.textContent =
                "Sucursal: " + datos.sucursal.nombreSucursal;

        } catch (error) {
            console.error("Error consultando sucursal:", error);
            sucursalCabecera.textContent = "Sucursal #" + numero;
        }
    }

    // Se ejecuta sin bloquear la carga de usuarios.
    mostrarSucursalUsuario();

    // ============================================
    // ELEMENTOS DE LA PÁGINA
    // ============================================

    const tabla = document.getElementById("tablaUsuarios");
    const contador = document.getElementById("totalUsuarios");
    const buscar = document.getElementById("buscarUsuario");
    const filtroRol = document.getElementById("filtroRol");
    const filtroEstado = document.getElementById("filtroEstado");
    const mensaje = document.getElementById("mensajeUsuarios");

    const modal = document.getElementById("modalUsuario");
    const tituloModal = document.getElementById("tituloModalUsuario");
    const form = document.getElementById("formUsuario");
    const mensajeFormulario = document.getElementById("mensajeFormulario");

    const idEditar = document.getElementById("idUsuarioEditar");
    const nombreEditar = document.getElementById("nombreEditar");
    const usuarioEditar = document.getElementById("usuarioEditar");
    const rolEditar = document.getElementById("rolEditar");
    const sucursalEditar = document.getElementById("sucursalEditar");

    const grupoClaveNueva = document.getElementById("grupoClaveNueva");
    const claveNuevoUsuario = document.getElementById("claveNuevoUsuario");
    const btnGuardar = document.getElementById("btnGuardarUsuario");
    const btnNuevo = document.getElementById("btnNuevoUsuario");

    const modalClave = document.getElementById("modalClave");
    const formClave = document.getElementById("formCambiarClave");
    const idUsuarioClave = document.getElementById("idUsuarioClave");
    const nombreUsuarioClave = document.getElementById("nombreUsuarioClave");
    const claveNueva = document.getElementById("claveNueva");
    const confirmarClave = document.getElementById("confirmarClave");
    const mensajeClave = document.getElementById("mensajeClave");
    const btnGuardarClave = document.getElementById("btnGuardarClave");

    // ============================================
    // VARIABLES
    // ============================================

    let usuarios = [];
    let sucursales = [];
    let modoFormulario = "crear";
    let sucursalesCargadas = false;
    let guardandoUsuario = false;

    // ============================================
    // MENSAJES
    // ============================================

    function mostrarMensaje(texto, tipo = "exito") {
        mensaje.textContent = texto;
        mensaje.className = "mensaje " + tipo;
    }

    function mostrarMensajeFormulario(texto, tipo = "error") {
        mensajeFormulario.textContent = texto;
        mensajeFormulario.className = "mensaje-formulario " + tipo;
    }

    function mostrarMensajeClave(texto, tipo = "error") {
        mensajeClave.textContent = texto;
        mensajeClave.className = "mensaje-formulario " + tipo;
    }

    // ============================================
    // PETICIONES AL BACKEND
    // ============================================

    async function peticion(url, opciones = {}) {

        const respuesta = await fetch(url, {
            ...opciones,
            credentials: "include"
        });

        let datos;

        try {
            datos = await respuesta.json();
        } catch (error) {
            throw new Error(
                "El servidor no devolvió una respuesta JSON válida."
            );
        }

        if (respuesta.status === 401) {
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
            )
        ) {
            throw new Error(
                datos.mensaje || "No se pudo completar la operación."
            );
        }

        return datos;
    }

    // ============================================
    // PERMISOS
    // ============================================

    function puedeAdministrarUsuario(u) {

        if (esAdmin) return true;

        if (!esEncargado || !u) return false;

        return (
            String(u.rol || "").toUpperCase() === "VENDEDOR" &&
            Number(u.idSucursal) === miSucursal
        );
    }

    function configurarRoles() {

        rolEditar.replaceChildren();

        const roles = esEncargado
            ? [
                ["VENDEDOR", "Vendedor"]
            ]
            : [
                ["ADMIN", "Administrador"],
                ["SUCURSAL", "Encargado de sucursal"],
                ["VENDEDOR", "Vendedor"],
                ["REPARTIDOR", "Repartidor"]
            ];

        roles.forEach(function (item) {
            const opcion = document.createElement("option");
            opcion.value = item[0];
            opcion.textContent = item[1];
            rolEditar.appendChild(opcion);
        });

        rolEditar.disabled = esEncargado;

        if (esEncargado) {
            rolEditar.value = "VENDEDOR";
        }
    }

    // ============================================
    // CARGAR SUCURSALES
    // ============================================

    async function cargarSucursales(idSeleccionado = "") {

        sucursalesCargadas = false;
        sucursalEditar.disabled = true;
        sucursalEditar.replaceChildren();

        const cargando = document.createElement("option");
        cargando.value = "";
        cargando.textContent = "Cargando sucursales...";
        sucursalEditar.appendChild(cargando);

        try {

            const datos = await peticion(API_SUCURSALES);

            if (!Array.isArray(datos.sucursales)) {
                throw new Error(
                    "El servidor no devolvió las sucursales."
                );
            }

            sucursales = datos.sucursales.filter(function (s) {
                return Number(s.activo) === 1;
            });

            sucursalEditar.replaceChildren();

            const inicial = document.createElement("option");
            inicial.value = "";
            inicial.textContent = "Seleccione una sucursal";
            sucursalEditar.appendChild(inicial);

            sucursales.forEach(function (s) {

                const opcion = document.createElement("option");
                opcion.value = String(s.idSucursal);
                opcion.textContent = s.nombreSucursal;

                sucursalEditar.appendChild(opcion);
            });

            const seleccionado = esEncargado
                ? String(miSucursal)
                : String(idSeleccionado ?? "");

            if (seleccionado !== "") {

                const existe = sucursales.some(function (s) {
                    return String(s.idSucursal) === seleccionado;
                });

                if (!existe) {
                    throw new Error(
                        "La sucursal asignada no existe o está inactiva."
                    );
                }

                sucursalEditar.value = seleccionado;
            }

            sucursalesCargadas = true;
            configurarSucursal();

            return true;

        } catch (error) {

            console.error("Error cargando sucursales:", error);

            sucursales = [];
            sucursalesCargadas = false;
            sucursalEditar.replaceChildren();

            const opcion = document.createElement("option");
            opcion.value = "";
            opcion.textContent = "No se pudieron cargar las sucursales";
            sucursalEditar.appendChild(opcion);

            sucursalEditar.disabled = true;

            mostrarMensajeFormulario(error.message);

            return false;
        }
    }

    function configurarSucursal() {

        if (!sucursalesCargadas) {
            sucursalEditar.disabled = true;
            return;
        }

        if (esEncargado) {
            sucursalEditar.value = String(miSucursal);
            sucursalEditar.disabled = true;
        } else {
            sucursalEditar.disabled = false;
        }
    }

    // ============================================
    // CARGAR USUARIOS DESDE ORACLE
    // ============================================

    async function cargarUsuarios() {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="sin-datos">
                    Cargando usuarios...
                </td>
            </tr>
        `;

        mostrarMensaje("");

        try {

            const datos = await peticion(API + "/todos");

            if (!Array.isArray(datos.usuarios)) {
                throw new Error(
                    "El servidor no devolvió una lista válida de usuarios."
                );
            }

            usuarios = datos.usuarios.filter(
                puedeAdministrarUsuario
            );

            mostrarUsuarios();

            return true;

        } catch (error) {

            console.error("Error cargando usuarios:", error);

            usuarios = [];
            contador.textContent = "0 usuarios";

            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se pudieron cargar los usuarios.
                    </td>
                </tr>
            `;

            mostrarMensaje(error.message, "error");

            return false;
        }
    }

    // ============================================
    // FUNCIONES PARA LA TABLA
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

    function formatearFecha(valor) {

        if (valor === null || valor === undefined || valor === "") {
            return "—";
        }

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleDateString("es-GT");
    }

    function crearBoton(texto, clase, accion) {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.textContent = texto;
        boton.className = clase;

        boton.addEventListener("click", function () {
            accion(boton);
        });

        return boton;
    }

    // ============================================
    // MOSTRAR Y FILTRAR USUARIOS
    // ============================================

    function mostrarUsuarios() {

        const texto = buscar.value.trim().toLowerCase();
        const rolSeleccionado = filtroRol.value;
        const estadoSeleccionado = filtroEstado.value;

        const filtrados = usuarios.filter(function (u) {

            const nombre = String(u.nombreUsuario || "").toLowerCase();
            const cuenta = String(u.usuario || "").toLowerCase();
            const rol = String(u.rol || "").toUpperCase();
            const activo = String(u.activo);

            const coincideBusqueda =
                nombre.includes(texto) ||
                cuenta.includes(texto);

            const coincideRol =
                rolSeleccionado === "" ||
                rol === rolSeleccionado;

            const coincideEstado =
                estadoSeleccionado === "todos" ||
                activo === estadoSeleccionado;

            return (
                coincideBusqueda &&
                coincideRol &&
                coincideEstado
            );
        });

        contador.textContent =
            filtrados.length +
            (filtrados.length === 1 ? " usuario" : " usuarios");

        tabla.replaceChildren();

        if (filtrados.length === 0) {

            tabla.innerHTML = `
                <tr>
                    <td colspan="8" class="sin-datos">
                        No se encontraron usuarios.
                    </td>
                </tr>
            `;

            return;
        }

        filtrados.forEach(function (u) {

            const fila = document.createElement("tr");

            agregarCelda(fila, u.idUsuario);
            agregarCelda(fila, u.nombreUsuario);
            agregarCelda(fila, u.usuario);
            agregarCelda(fila, obtenerNombreRol(u.rol));

            agregarCelda(
                fila,
                u.nombreSucursal ||
                (
                    u.idSucursal == null
                        ? "Sin sucursal"
                        : "Sucursal #" + u.idSucursal
                )
            );

            const activo = Number(u.activo) === 1;

            const tdEstado = document.createElement("td");
            const etiqueta = document.createElement("span");

            etiqueta.className =
                "estado " +
                (activo ? "estado-activo" : "estado-inactivo");

            etiqueta.textContent =
                activo ? "Activo" : "Desactivado";

            tdEstado.appendChild(etiqueta);
            fila.appendChild(tdEstado);

            agregarCelda(
                fila,
                formatearFecha(u.fechaCreacion)
            );

            const tdAcciones = document.createElement("td");
            const contenedor = document.createElement("div");

            contenedor.className = "acciones";

            if (activo) {

                const btnEditar = crearBoton(
                    "Editar",
                    "btn-editar",
                    function () {
                        abrirModalEditar(u);
                    }
                );

                contenedor.appendChild(btnEditar);

                const btnClave = crearBoton(
                    "Cambiar contraseña",
                    "btn-editar",
                    function () {
                        abrirModalClave(u);
                    }
                );

                contenedor.appendChild(btnClave);

                if (
                    Number(u.idUsuario) !==
                    Number(usuarioActual.idUsuario)
                ) {

                    const btnDesactivar = crearBoton(
                        "Desactivar",
                        "btn-desactivar",
                        function (boton) {
                            cambiarEstado(u, false, boton);
                        }
                    );

                    contenedor.appendChild(btnDesactivar);
                }

            } else {

                const btnReactivar = crearBoton(
                    "Reactivar",
                    "btn-reactivar",
                    function (boton) {
                        cambiarEstado(u, true, boton);
                    }
                );

                contenedor.appendChild(btnReactivar);
            }

            tdAcciones.appendChild(contenedor);
            fila.appendChild(tdAcciones);
            tabla.appendChild(fila);
        });
    }

    // ============================================
    // ABRIR FORMULARIO DE NUEVO USUARIO
    // ============================================

    async function abrirModalNuevo() {

        modoFormulario = "crear";

        form.reset();
        idEditar.value = "";

        tituloModal.textContent = "Registrar nuevo usuario";

        grupoClaveNueva.hidden = false;
        claveNuevoUsuario.required = true;
        claveNuevoUsuario.value = "";

        configurarRoles();
        rolEditar.value = "VENDEDOR";

        btnGuardar.textContent = "Registrar usuario";
        btnGuardar.disabled = true;

        mostrarMensajeFormulario("");

        modal.hidden = false;
        nombreEditar.focus();

        const cargadas = await cargarSucursales(
            esEncargado ? miSucursal : ""
        );

        btnGuardar.disabled = !cargadas;
    }

    // ============================================
    // ABRIR FORMULARIO DE EDICIÓN
    // ============================================

    async function abrirModalEditar(u) {

        if (!puedeAdministrarUsuario(u)) {
            mostrarMensaje(
                "No tiene permisos sobre este usuario.",
                "error"
            );
            return;
        }

        modoFormulario = "editar";

        form.reset();

        idEditar.value = u.idUsuario;
        nombreEditar.value = u.nombreUsuario || "";
        usuarioEditar.value = u.usuario || "";

        configurarRoles();

        rolEditar.value = esEncargado
            ? "VENDEDOR"
            : (u.rol || "VENDEDOR");

        tituloModal.textContent = "Editar usuario";

        grupoClaveNueva.hidden = true;
        claveNuevoUsuario.required = false;
        claveNuevoUsuario.value = "";

        btnGuardar.textContent = "Guardar cambios";
        btnGuardar.disabled = true;

        mostrarMensajeFormulario("");

        modal.hidden = false;
        nombreEditar.focus();

        const cargadas = await cargarSucursales(
            esEncargado ? miSucursal : u.idSucursal
        );

        btnGuardar.disabled = !cargadas;
    }

    // ============================================
    // CERRAR FORMULARIO
    // ============================================

    function cerrarModal() {

        if (guardandoUsuario) return;

        modal.hidden = true;
        form.reset();
        idEditar.value = "";
        claveNuevoUsuario.required = false;

        mostrarMensajeFormulario("");
    }

    // ============================================
    // GUARDAR USUARIO
    // ============================================

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (guardandoUsuario) return;

        if (!sucursalesCargadas) {
            mostrarMensajeFormulario(
                "Primero deben cargarse las sucursales."
            );
            return;
        }

        const nombre = nombreEditar.value.trim();
        const cuenta = usuarioEditar.value.trim();

        const rol = esEncargado
            ? "VENDEDOR"
            : rolEditar.value;

        const textoSucursal = esEncargado
            ? String(miSucursal)
            : String(sucursalEditar.value || "").trim();

        const idSucursal = textoSucursal === ""
            ? null
            : Number(textoSucursal);

        const clave = claveNuevoUsuario.value;

        const rolesPermitidos = [
            "ADMIN",
            "SUCURSAL",
            "VENDEDOR",
            "REPARTIDOR"
        ];

        if (
            !nombre ||
            !cuenta ||
            !rolesPermitidos.includes(rol)
        ) {
            mostrarMensajeFormulario(
                "Verifique los datos ingresados."
            );
            return;
        }

        if (
            (rol === "SUCURSAL" || rol === "VENDEDOR") &&
            idSucursal === null
        ) {
            mostrarMensajeFormulario(
                "Debe seleccionar una sucursal."
            );
            return;
        }

        if (idSucursal !== null) {

            if (
                !Number.isInteger(idSucursal) ||
                idSucursal <= 0
            ) {
                mostrarMensajeFormulario(
                    "La sucursal seleccionada no es válida."
                );
                return;
            }

            const existe = sucursales.some(function (s) {
                return Number(s.idSucursal) === idSucursal;
            });

            if (!existe) {
                mostrarMensajeFormulario(
                    "Seleccione una sucursal activa."
                );
                return;
            }
        }

        const esNuevo = modoFormulario === "crear";

        if (esNuevo && !clave.trim()) {
            mostrarMensajeFormulario(
                "Debe ingresar una contraseña."
            );
            return;
        }

        const id = Number(idEditar.value);

        if (!esNuevo) {

            if (!Number.isInteger(id) || id <= 0) {
                mostrarMensajeFormulario(
                    "ID de usuario no válido."
                );
                return;
            }

            const usuarioObjetivo = usuarios.find(function (u) {
                return Number(u.idUsuario) === id;
            });

            if (!usuarioObjetivo || !puedeAdministrarUsuario(usuarioObjetivo)) {
                mostrarMensajeFormulario(
                    "No tiene permisos sobre este usuario."
                );
                return;
            }

            if (
                esAdmin &&
                id === Number(usuarioActual.idUsuario) &&
                rol !== "ADMIN"
            ) {
                mostrarMensajeFormulario(
                    "No puede quitarse su propio rol de administrador."
                );
                return;
            }
        }

        const pregunta = esNuevo
            ? '¿Registrar al usuario "' + nombre + '"?'
            : '¿Guardar los cambios de "' + nombre + '"?';

        if (!window.confirm(pregunta)) return;

        guardandoUsuario = true;
        btnGuardar.disabled = true;

        btnGuardar.textContent = esNuevo
            ? "Registrando..."
            : "Guardando...";

        mostrarMensajeFormulario("");

        try {

            let url;
            let metodo;
            let cuerpo;

            if (esNuevo) {

                url = API;
                metodo = "POST";

                cuerpo = {
                    nombreUsuario: nombre,
                    usuario: cuenta,
                    clave: clave,
                    rol: rol,
                    idSucursal: idSucursal
                };

            } else {

                url = API + "/" + encodeURIComponent(id);
                metodo = "PUT";

                cuerpo = {
                    nombreUsuario: nombre,
                    usuario: cuenta,
                    rol: rol,
                    idSucursal: idSucursal
                };
            }

            const datos = await peticion(url, {
                method: metodo,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cuerpo)
            });

            modal.hidden = true;
            form.reset();

            if (esNuevo) {

                filtroEstado.value = "1";

                if (!esEncargado) {
                    filtroRol.value = "";
                }

                buscar.value = "";
            }

            const actualizado = await cargarUsuarios();

            if (actualizado) {
                mostrarMensaje(
                    datos.mensaje ||
                    (
                        esNuevo
                            ? "Usuario registrado correctamente."
                            : "Usuario actualizado correctamente."
                    )
                );
            }

        } catch (error) {

            mostrarMensajeFormulario(error.message);

            modal.hidden = false;

        } finally {

            guardandoUsuario = false;
            btnGuardar.disabled = false;

            btnGuardar.textContent = esNuevo
                ? "Registrar usuario"
                : "Guardar cambios";
        }
    });

    // ============================================
    // DESACTIVAR / REACTIVAR
    // ============================================

    async function cambiarEstado(u, reactivar, boton) {

        if (!puedeAdministrarUsuario(u)) {
            mostrarMensaje(
                "No tiene permisos sobre este usuario.",
                "error"
            );
            return;
        }

        if (
            !reactivar &&
            Number(u.idUsuario) === Number(usuarioActual.idUsuario)
        ) {
            mostrarMensaje(
                "No puede desactivar su propia cuenta.",
                "error"
            );
            return;
        }

        const accion = reactivar
            ? "reactivar"
            : "desactivar";

        if (!window.confirm(
            '¿Desea ' + accion +
            ' al usuario "' + u.nombreUsuario + '"?'
        )) {
            return;
        }

        boton.disabled = true;

        const textoOriginal = boton.textContent;

        boton.textContent = reactivar
            ? "Reactivando..."
            : "Desactivando...";

        try {

            const url =
                API + "/" +
                encodeURIComponent(u.idUsuario) +
                (reactivar ? "/reactivar" : "");

            const datos = await peticion(url, {
                method: reactivar ? "PUT" : "DELETE"
            });

            const actualizado = await cargarUsuarios();

            if (actualizado) {
                mostrarMensaje(
                    datos.mensaje ||
                    "Operación realizada correctamente."
                );
            }

        } catch (error) {

            mostrarMensaje(error.message, "error");

        } finally {

            boton.disabled = false;
            boton.textContent = textoOriginal;
        }
    }

    // ============================================
    // ABRIR CAMBIO DE CONTRASEÑA
    // ============================================

    function abrirModalClave(u) {

        if (!puedeAdministrarUsuario(u)) {
            mostrarMensaje(
                "No tiene permisos sobre este usuario.",
                "error"
            );
            return;
        }

        formClave.reset();

        idUsuarioClave.value = u.idUsuario;

        nombreUsuarioClave.value =
            u.nombreUsuario + " (" + u.usuario + ")";

        mostrarMensajeClave("");

        modalClave.hidden = false;
        claveNueva.focus();
    }

    // ============================================
    // CERRAR CAMBIO DE CONTRASEÑA
    // ============================================

    function cerrarModalClave() {

        if (btnGuardarClave.disabled) return;

        modalClave.hidden = true;
        formClave.reset();
        idUsuarioClave.value = "";

        mostrarMensajeClave("");
    }

    // ============================================
    // GUARDAR NUEVA CONTRASEÑA
    // ============================================

    formClave.addEventListener("submit", async function (event) {

        event.preventDefault();

        const id = Number(idUsuarioClave.value);
        const nueva = claveNueva.value;
        const confirmacion = confirmarClave.value;

        if (!Number.isInteger(id) || id <= 0) {
            mostrarMensajeClave(
                "ID de usuario no válido."
            );
            return;
        }

        const usuarioObjetivo = usuarios.find(function (u) {
            return Number(u.idUsuario) === id;
        });

        if (!usuarioObjetivo || !puedeAdministrarUsuario(usuarioObjetivo)) {
            mostrarMensajeClave(
                "No tiene permisos sobre este usuario."
            );
            return;
        }

        if (!nueva.trim()) {
            mostrarMensajeClave(
                "Debe ingresar una contraseña."
            );
            return;
        }

        if (nueva !== confirmacion) {
            mostrarMensajeClave(
                "Las contraseñas no coinciden."
            );
            return;
        }

        if (!window.confirm(
            "¿Confirmar el cambio de contraseña?"
        )) {
            return;
        }

        btnGuardarClave.disabled = true;
        btnGuardarClave.textContent = "Guardando...";

        mostrarMensajeClave("");

        try {

            const datos = await peticion(
                API + "/" + encodeURIComponent(id) + "/clave",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        claveNueva: nueva
                    })
                }
            );

            modalClave.hidden = true;
            formClave.reset();

            mostrarMensaje(
                datos.mensaje ||
                "Contraseña actualizada correctamente."
            );

        } catch (error) {

            mostrarMensajeClave(error.message);

        } finally {

            btnGuardarClave.disabled = false;
            btnGuardarClave.textContent = "Cambiar contraseña";
        }
    });

    // ============================================
    // EVENTOS DE LOS MODALES
    // ============================================

    btnNuevo.addEventListener("click", abrirModalNuevo);

    document.getElementById("btnCerrarModal")
        .addEventListener("click", cerrarModal);

    document.getElementById("btnCancelarUsuario")
        .addEventListener("click", cerrarModal);

    document.getElementById("btnCerrarModalClave")
        .addEventListener("click", cerrarModalClave);

    document.getElementById("btnCancelarClave")
        .addEventListener("click", cerrarModalClave);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            cerrarModal();
        }
    });

    modalClave.addEventListener("click", function (event) {
        if (event.target === modalClave) {
            cerrarModalClave();
        }
    });

    document.addEventListener("keydown", function (event) {

        if (event.key !== "Escape") return;

        if (!modalClave.hidden) {
            cerrarModalClave();
        } else if (!modal.hidden) {
            cerrarModal();
        }
    });

    // ============================================
    // FILTROS
    // ============================================

    buscar.addEventListener("input", mostrarUsuarios);
    filtroRol.addEventListener("change", mostrarUsuarios);
    filtroEstado.addEventListener("change", mostrarUsuarios);

    document.getElementById("btnActualizar")
        .addEventListener("click", cargarUsuarios);

    // ============================================
    // CERRAR SESIÓN
    // ============================================

    document.getElementById("btnCerrarSesion")
        .addEventListener("click", async function () {

            try {

                await peticion(API + "/logout", {
                    method: "POST"
                });

                sessionStorage.removeItem("usuario");
                window.location.replace("index.html");

            } catch (error) {

                mostrarMensaje(
                    "No se pudo cerrar sesión: " + error.message,
                    "error"
                );
            }
        });

    // ============================================
    // CONFIGURACIÓN INICIAL
    // ============================================

    configurarRoles();

    if (esEncargado) {
        filtroRol.value = "VENDEDOR";
        filtroRol.disabled = true;
    }

    // ============================================
    // CARGAR USUARIOS AL ABRIR LA PÁGINA
    // ============================================

    cargarUsuarios();

});




