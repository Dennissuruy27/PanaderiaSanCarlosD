document.addEventListener("DOMContentLoaded", function () {

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

            // Evita que HTML recargue la página
            event.preventDefault();


            // ====================================
            // OBTENER DATOS
            // ====================================

            const usuario =
                    inputUsuario.value.trim();

            const clave =
                    inputClave.value;


            // ====================================
            // VALIDACION
            // ====================================

            if (usuario === "" || clave === "") {

                mostrarError(
                    "Debe ingresar usuario y contraseña."
                );

                return;
            }


            // ====================================
            // PREPARAR BOTON
            // ====================================

            boton.disabled = true;

            boton.textContent =
                    "Ingresando...";

            limpiarMensaje();


            try {

                // =================================
                // LLAMAR AL BACKEND
                // =================================

                const respuesta =
                        await fetch(
                            "api/usuarios/login",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                            "application/json"
                                },

                                body: JSON.stringify({

                                    usuario: usuario,

                                    clave: clave

                                })
                            }
                        );


                // =================================
                // LEER JSON
                // =================================

                const datos =
                        await respuesta.json();


                // =================================
                // ERROR HTTP
                // =================================

                if (!respuesta.ok) {

                    mostrarError(
                        datos.mensaje ||
                        "No fue posible iniciar sesión."
                    );

                    return;
                }


                // =================================
                // LOGIN CORRECTO
                // =================================

                if (datos.estado === "OK") {

                    mostrarExito(
                        "Login correcto."
                    );


                    // Mostrar en consola
                    // solamente para pruebas

                    console.log(
                        "Usuario autenticado:",
                        datos.usuario
                    );


                    // =================================
                    // GUARDAR USUARIO
                    // =================================

                    sessionStorage.setItem(
                        "usuario",
                        JSON.stringify(
                            datos.usuario
                        )
                    );


                    // =================================
                    // IR AL DASHBOARD
                    // =================================

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
                    "Error:",
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
    // MOSTRAR ERROR
    // ============================================

    function mostrarError(texto) {

        mensaje.textContent = texto;

        mensaje.className =
                "mensaje mensaje-error";
    }


    // ============================================
    // MOSTRAR EXITO
    // ============================================

    function mostrarExito(texto) {

        mensaje.textContent = texto;

        mensaje.className =
                "mensaje mensaje-exito";
    }


    // ============================================
    // LIMPIAR MENSAJE
    // ============================================

    function limpiarMensaje() {

        mensaje.textContent = "";

        mensaje.className =
                "mensaje";
    }

});
