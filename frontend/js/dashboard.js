
document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // CONFIGURACIÓN DEL BACKEND
    // =====================================

    const API_USUARIOS =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios";

    const API_SUCURSALES =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/sucursales";


    // =====================================
    // OBTENER ELEMENTOS
    // =====================================

    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const rolUsuario =
        document.getElementById("rolUsuario");

    const sucursalUsuario =
        document.getElementById("sucursalUsuario");

    const btnCerrarSesion =
        document.getElementById("btnCerrarSesion");


    // =====================================
    // VERIFICAR SESIÓN
    // =====================================

    const usuarioGuardado =
        sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {

        window.location.replace("index.html");
        return;
    }


    // =====================================
    // OBTENER INFORMACIÓN DEL USUARIO
    // =====================================

    let usuario;

    try {

        usuario = JSON.parse(usuarioGuardado);

        if (!usuario || typeof usuario !== "object") {
            throw new Error("Sesión inválida");
        }

    } catch (error) {

        sessionStorage.removeItem("usuario");

        window.location.replace("index.html");
        return;
    }


    // =====================================
    // MOSTRAR NOMBRE DEL USUARIO
    // =====================================

    if (nombreUsuario) {

        nombreUsuario.textContent =
            usuario.nombreUsuario ||
            usuario.usuario ||
            "Usuario";
    }


    // =====================================
    // MOSTRAR ROL DEL USUARIO
    // =====================================

    function obtenerNombreRol(rol) {

        const roles = {
            ADMIN: "Administrador",
            SUCURSAL: "Encargado de sucursal",
            VENDEDOR: "Vendedor",
            REPARTIDOR: "Repartidor"
        };

        return roles[
            String(rol || "").toUpperCase()
        ] || "Sin rol";
    }

    if (rolUsuario) {

        rolUsuario.textContent =
            obtenerNombreRol(usuario.rol);
    }


    // =====================================
    // MOSTRAR SUCURSAL DEL USUARIO
    // =====================================

    async function mostrarSucursalUsuario() {

        if (!sucursalUsuario) {
            return;
        }

        const idSucursal = usuario.idSucursal;

        // Usuarios sin sucursal asignada

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

            // CONSULTAR SUCURSAL EN ORACLE

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
                    "No se pudo consultar la sucursal."
                );
            }

            const datos = await respuesta.json();

            if (
                datos.estado !== "OK" ||
                !datos.sucursal
            ) {

                throw new Error(
                    datos.mensaje ||
                    "Sucursal no encontrada."
                );
            }

            // MOSTRAR NOMBRE REAL DE LA SUCURSAL

            sucursalUsuario.textContent =
                "Sucursal: " +
                datos.sucursal.nombreSucursal;

        } catch (error) {

            console.error(
                "Error al obtener sucursal:",
                error
            );

            // MOSTRAR ID COMO RESPALDO

            sucursalUsuario.textContent =
                "Sucursal #" + id;
        }
    }


    // =====================================
    // CERRAR SESIÓN
    // =====================================

    if (btnCerrarSesion) {

        btnCerrarSesion.addEventListener(
            "click",
            async function () {

                btnCerrarSesion.disabled = true;

                try {

                    // CERRAR SESIÓN EN EL BACKEND

                    const respuesta = await fetch(
                        API_USUARIOS + "/logout",
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                    if (!respuesta.ok) {

                        throw new Error(
                            "Error al cerrar sesión."
                        );
                    }

                    // ELIMINAR DATOS DEL USUARIO

                    sessionStorage.removeItem("usuario");

                    // REGRESAR AL LOGIN

                    window.location.replace("index.html");

                } catch (error) {

                    console.error(
                        "Error al cerrar sesión:",
                        error
                    );

                    alert(
                        "No se pudo cerrar la sesión. " +
                        "Inténtalo nuevamente."
                    );

                    btnCerrarSesion.disabled = false;
                }
            }
        );
    }


    // =====================================
    // CARGA INICIAL
    // =====================================

    mostrarSucursalUsuario();

});

