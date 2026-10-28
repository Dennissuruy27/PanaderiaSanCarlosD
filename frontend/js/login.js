
document.addEventListener("DOMContentLoaded", function () {

    // ============================================
    // CONFIGURACION DEL BACKEND EN RENDER
    // ============================================

    const API_LOGIN =
        "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios/login";


    // ============================================
    // ELEMENTOS DEL HTML
    // ============================================

    const formulario =
        document.getElementById("loginForm");

    const inputUsuario =
        document.getElementById("usuario");

    const inputClave =
        document.getElementById("clave");

    const mensaje =
        document.getElementById("mensaje");

    const boton =
        document.getElementById("btnLogin");


    // ============================================
    // EVENTO DEL FORMULARIO
    // ============================================

    formulario.addEventListener(
        "submit",
        async function (event) {

            // Evitar que la pagina se recargue
            event.preventDefault();


            // ====================================
            // OBTENER DATOS DEL FORMULARIO
            // ====================================

            const usuario =
                inputUsuario.value.trim();

            const clave =
                inputClave.value;


            // ====================================
            // VALIDAR CAMPOS
            // ====================================

            if (usuario === "" || clave === "") {

                mostrarError(
                    "Debe ingresar usuario y contraseña."
                );

                return;
            }


            // ====================================
            // DESHABILITAR BOTON
            // ====================================

            boton.disabled = true;

            boton.textContent =
                "Ingresando...";

            limpiarMensaje();


            try {

                // ====================================
                // CONECTAR CON BACKEND EN RENDER
                // ====================================

                const respuesta = await fetch(
                    API_LOGIN,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        // Mantener compatibilidad con
                        // sesiones HTTP de Tomcat
                        credentials: "include",

                        body: JSON.stringify({
                            usuario: usuario,
                            clave: clave
                        })
                    }
                );


                // ====================================
                // LEER RESPUESTA DEL BACKEND
                // ====================================

                const datos =
                    await respuesta.json();


                // ====================================
                // VALIDAR RESPUESTA HTTP
                // ====================================

                if (!respuesta.ok) {

                    mostrarError(
                        datos.mensaje ||
                        "No fue posible iniciar sesión."
                    );

                    return;
                }


                // ====================================
                // LOGIN CORRECTO
                // ====================================

                if (datos.estado === "OK") {

                    mostrarExito(
                        "Inicio de sesión correcto."
                    );


                    console.log(
                        "Usuario autenticado correctamente."
                    );


                    // ====================================
                    // GUARDAR INFORMACION DEL USUARIO
                    // ====================================

                    sessionStorage.setItem(
                        "usuario",
                        JSON.stringify(datos.usuario)
                    );


                    // ====================================
                    // REDIRIGIR AL DASHBOARD
                    // ====================================

                    setTimeout(
                        function () {

                            window.location.href =
                                "dashboard.html";

                        },
                        700
                    );

                } else {

                    mostrarError(
                        datos.mensaje ||
                        "Usuario o contraseña incorrectos."
                    );
                }


            } catch (error) {

                console.error(
                    "Error al conectar con el backend:",
                    error
                );

                mostrarError(
                    "No fue posible conectar con el servidor."
                );

            } finally {

                boton.disabled = false;

                boton.textContent =
                    "Iniciar sesión";
            }

        }
    );


    // ============================================
    // MOSTRAR MENSAJE DE ERROR
    // ============================================

    function mostrarError(texto) {

        mensaje.textContent = texto;

        mensaje.className =
            "mensaje mensaje-error";
    }


    // ============================================
    // MOSTRAR MENSAJE DE EXITO
    // ============================================

    function mostrarExito(texto) {

        mensaje.textContent = texto;

        mensaje.className =
            "mensaje mensaje-exito";
    }


    // ============================================
    // LIMPIAR MENSAJES
    // ============================================

    function limpiarMensaje() {

        mensaje.textContent = "";

        mensaje.className =
            "mensaje";
    }

});
