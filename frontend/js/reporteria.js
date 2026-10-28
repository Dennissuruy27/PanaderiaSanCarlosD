
/* =========================================
   PANADERÍA SAN CARLOS - REPORTERÍA
========================================= */

const API_REPORTERIA =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/reporteria";

const API_LOGOUT =
    "https://panaderiasancarlosd.onrender.com/PROYECTOWEB/api/usuarios/logout";

const $ = id => document.getElementById(id);

let usuarioActual = null;
let datosReportes = {
    materias: [],
    terminados: [],
    solicitados: [],
    sucursales: [],
    producidos: []
};

const NOMBRES_SUCURSALES = {
    1: "Central",
    2: "Chiva",
    3: "Barco",
    4: "Heydi",
    5: "Terminal"
};

/* =========================================
   UTILIDADES
========================================= */

function escapar(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function numero(valor) {
    const resultado = Number(valor ?? 0);
    return Number.isFinite(resultado) ? resultado : 0;
}

function formatoNumero(valor) {
    return numero(valor).toLocaleString("es-GT", {
        maximumFractionDigits: 3
    });
}

function mostrarMensaje(texto, tipo = "exito") {
    const elemento = $("mensaje");
    elemento.textContent = texto;
    elemento.className = "mensaje " + tipo;
}

function mostrarErrorTabla(id, columnas, mensaje) {
    $(id).innerHTML = `
        <tr>
            <td colspan="${columnas}" class="sin-datos">
                ${escapar(mensaje)}
            </td>
        </tr>
    `;
}

function obtenerLista(datos) {
    if (!Array.isArray(datos)) {
        throw new Error(
            "El servidor no devolvió una lista de resultados."
        );
    }
    return datos;
}

/* =========================================
   SESIÓN
========================================= */

function verificarSesion() {
    const guardado = sessionStorage.getItem("usuario");

    if (!guardado) {
        window.location.replace("index.html");
        return false;
    }

    try {
        usuarioActual = JSON.parse(guardado);
    } catch (error) {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return false;
    }

    if (!usuarioActual || typeof usuarioActual !== "object") {
        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");
        return false;
    }

    const rol = String(
        usuarioActual.rol || ""
    ).trim().toUpperCase();

    $("nombreUsuario").textContent =
        usuarioActual.nombreUsuario ||
        usuarioActual.usuario ||
        "Usuario";

    $("rolUsuario").textContent =
        rol === "ADMIN" ? "Administrador" : rol;

    const idSucursal = Number(
        usuarioActual.idSucursal ??
        usuarioActual.id_sucursal ??
        0
    );

    $("sucursalUsuario").textContent =
        idSucursal > 0
            ? "Sucursal: " +
            (NOMBRES_SUCURSALES[idSucursal] || idSucursal)
            : "Administración";

    if (rol !== "ADMIN") {
        mostrarMensaje(
            "No tienes permisos para consultar Reportería.",
            "error"
        );
        deshabilitarControles();
        return false;
    }

    return true;
}

function deshabilitarControles() {
    document.querySelectorAll(
        "#btnActualizar, #btnFiltrar, #btnLimpiar, " +
        ".btn-imprimir, #fechaInicio, #fechaFin, #filtroSucursal"
    ).forEach(elemento => {
        elemento.disabled = true;
    });
}

async function cerrarSesion() {
    const boton = $("btnCerrarSesion");
    boton.disabled = true;

    try {
        const respuesta = await fetch(API_LOGOUT, {
            method: "POST",
            credentials: "include"
        });

        if (!respuesta.ok) {
            throw new Error(
                "No se pudo cerrar la sesión en el servidor."
            );
        }

        sessionStorage.removeItem("usuario");
        window.location.replace("index.html");

    } catch (error) {
        mostrarMensaje(error.message, "error");
        boton.disabled = false;
    }
}

/* =========================================
   CONSULTAS REST
========================================= */

async function consultarAPI(ruta) {
    const respuesta = await fetch(
        API_REPORTERIA + ruta,
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }
    );

    const texto = await respuesta.text();

    let datos;

    try {
        datos = texto ? JSON.parse(texto) : null;
    } catch (error) {
        throw new Error(
            "Respuesta JSON inválida del servidor."
        );
    }

    if (!respuesta.ok) {
        if (respuesta.status === 401) {
            throw new Error(
                "La sesión ha expirado. Inicia sesión nuevamente."
            );
        }

        if (respuesta.status === 403) {
            throw new Error(
                "No tienes permisos para consultar este reporte."
            );
        }

        throw new Error(
            datos?.mensaje ||
            "Error HTTP " + respuesta.status
        );
    }

    return obtenerLista(datos);
}

function construirParametros(incluirSucursal) {
    const parametros = new URLSearchParams();

    const inicio = $("fechaInicio").value;
    const fin = $("fechaFin").value;
    const sucursal = $("filtroSucursal").value;

    if (inicio) {
        parametros.set("fechaInicio", inicio);
    }

    if (fin) {
        parametros.set("fechaFin", fin);
    }

    if (incluirSucursal && sucursal) {
        parametros.set("idSucursal", sucursal);
    }

    const consulta = parametros.toString();

    return consulta ? "?" + consulta : "";
}

function validarFiltros() {
    const inicio = $("fechaInicio").value;
    const fin = $("fechaFin").value;

    if (inicio && fin && inicio > fin) {
        throw new Error(
            "La fecha inicial no puede ser mayor que la final."
        );
    }
}

/* =========================================
   INVENTARIO
========================================= */

function mostrarInventario(idTabla, productos) {
    const tbody = $(idTabla);

    if (!productos.length) {
        mostrarErrorTabla(
            idTabla,
            6,
            "No se encontraron productos."
        );
        return;
    }

    tbody.innerHTML = productos.map(producto => {
        const existencia = numero(producto.existencia);
        const minimo = numero(producto.existenciaMinima);
        const bajo = existencia < minimo;

        return `
            <tr>
                <td>${escapar(producto.idProducto)}</td>
                <td>${escapar(producto.nombreProducto)}</td>
                <td>${escapar(producto.unidadMedida)}</td>
                <td>${formatoNumero(existencia)}</td>
                <td>${formatoNumero(minimo)}</td>
                <td>
                    <span class="estado ${bajo ? "bajo" : "ok"}">
                        ${bajo ? "Existencia baja" : "Disponible"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================
   GRÁFICAS DE BARRAS
========================================= */

function mostrarGrafica(idContenedor, datos, campoNombre, campoValor) {
    const contenedor = $(idContenedor);
    contenedor.innerHTML = "";

    if (!datos.length) {
        contenedor.innerHTML = `
            <p class="sin-datos">
                No hay información para mostrar en la gráfica.
            </p>
        `;
        return;
    }

    const maximo = Math.max(
        1,
        ...datos.map(fila => numero(fila[campoValor]))
    );

    datos.forEach(fila => {
        const nombre = String(fila[campoNombre] ?? "");
        const valor = numero(fila[campoValor]);
        const porcentaje = Math.max(
            0,
            Math.min(100, (valor / maximo) * 100)
        );

        const elemento = document.createElement("div");
        elemento.className = "grafica-fila";

        const etiqueta = document.createElement("div");
        etiqueta.className = "grafica-etiqueta";
        etiqueta.textContent = nombre;

        const barraFondo = document.createElement("div");
        barraFondo.className = "grafica-fondo";

        const barra = document.createElement("div");
        barra.className = "grafica-barra";
        barra.style.width = porcentaje + "%";

        barraFondo.appendChild(barra);

        const cantidad = document.createElement("strong");
        cantidad.className = "grafica-valor";
        cantidad.textContent = formatoNumero(valor);

        elemento.appendChild(etiqueta);
        elemento.appendChild(barraFondo);
        elemento.appendChild(cantidad);

        contenedor.appendChild(elemento);
    });
}

/* =========================================
   TOP PRODUCTOS SOLICITADOS
========================================= */

function mostrarSolicitados(productos) {
    const tbody = $("tablaSolicitados");

    if (!productos.length) {
        mostrarErrorTabla(
            "tablaSolicitados",
            5,
            "No hay productos solicitados en el período."
        );
    } else {
        tbody.innerHTML = productos.map((producto, indice) => `
            <tr>
                <td>${indice + 1}</td>
                <td>${escapar(producto.nombreProducto)}</td>
                <td>${escapar(producto.unidadMedida)}</td>
                <td>${formatoNumero(producto.totalSolicitado)}</td>
                <td>${formatoNumero(producto.totalPedidos)}</td>
            </tr>
        `).join("");
    }

    mostrarGrafica(
        "graficaSolicitados",
        productos,
        "nombreProducto",
        "totalSolicitado"
    );
}

/* =========================================
   SUCURSALES CON MÁS PEDIDOS
========================================= */

function mostrarSucursales(sucursales) {
    const tbody = $("tablaSucursales");

    if (!sucursales.length) {
        mostrarErrorTabla(
            "tablaSucursales",
            3,
            "No se encontraron sucursales."
        );
    } else {
        tbody.innerHTML = sucursales.map((sucursal, indice) => `
            <tr>
                <td>${indice + 1}</td>
                <td>${escapar(sucursal.nombreSucursal)}</td>
                <td>${formatoNumero(sucursal.totalPedidos)}</td>
            </tr>
        `).join("");
    }

    mostrarGrafica(
        "graficaSucursales",
        sucursales,
        "nombreSucursal",
        "totalPedidos"
    );

    $("totalPedidos").textContent = formatoNumero(
        sucursales.reduce(
            (suma, sucursal) =>
                suma + numero(sucursal.totalPedidos),
            0
        )
    );
}

/* =========================================
   TOP PRODUCTOS PRODUCIDOS
========================================= */

function mostrarProducidos(productos) {
    const tbody = $("tablaProducidos");

    if (!productos.length) {
        mostrarErrorTabla(
            "tablaProducidos",
            5,
            "No hay producciones completadas en el período."
        );
    } else {
        tbody.innerHTML = productos.map((producto, indice) => `
            <tr>
                <td>${indice + 1}</td>
                <td>${escapar(producto.nombreProducto)}</td>
                <td>${escapar(producto.unidadMedida)}</td>
                <td>${formatoNumero(producto.totalProducido)}</td>
                <td>${formatoNumero(producto.totalOrdenes)}</td>
            </tr>
        `).join("");
    }

    mostrarGrafica(
        "graficaProducidos",
        productos,
        "nombreProducto",
        "totalProducido"
    );
}

/* =========================================
   INDICADORES GENERALES
========================================= */

function actualizarIndicadoresInventario() {
    const materias = datosReportes.materias;
    const terminados = datosReportes.terminados;

    $("totalMaterias").textContent = formatoNumero(
        materias.length
    );

    $("totalTerminados").textContent = formatoNumero(
        terminados.length
    );

    const todos = [...materias, ...terminados];

    $("totalBajos").textContent = formatoNumero(
        todos.filter(producto =>
            numero(producto.existencia) <
            numero(producto.existenciaMinima)
        ).length
    );
}

/* =========================================
   CARGAR REPORTES
========================================= */

async function cargarReportes() {
    try {
        validarFiltros();
    } catch (error) {
        mostrarMensaje(error.message, "error");
        return;
    }

    const botones = [
        $("btnActualizar"),
        $("btnFiltrar")
    ];

    botones.forEach(boton => boton.disabled = true);

    mostrarMensaje("Consultando información de Oracle...", "info");

    const parametrosPedidos = construirParametros(true);
    const parametrosProduccion = construirParametros(false);

    const configuraciones = [
        {
            clave: "materias",
            ruta: "/materias-primas",
            tabla: "tablaMaterias",
            columnas: 6,
            mostrar: datos => {
                mostrarInventario("tablaMaterias", datos);
                actualizarIndicadoresInventario();
            }
        },
        {
            clave: "terminados",
            ruta: "/productos-terminados",
            tabla: "tablaTerminados",
            columnas: 6,
            mostrar: datos => {
                mostrarInventario("tablaTerminados", datos);
                actualizarIndicadoresInventario();
            }
        },
        {
            clave: "solicitados",
            ruta: "/top-productos-solicitados" +
                parametrosPedidos,
            tabla: "tablaSolicitados",
            columnas: 5,
            mostrar: mostrarSolicitados
        },
        {
            clave: "sucursales",
            ruta: "/top-sucursales" + parametrosPedidos,
            tabla: "tablaSucursales",
            columnas: 3,
            mostrar: mostrarSucursales
        },
        {
            clave: "producidos",
            ruta: "/top-productos-producidos" +
                parametrosProduccion,
            tabla: "tablaProducidos",
            columnas: 5,
            mostrar: mostrarProducidos
        }
    ];

    const resultados = await Promise.allSettled(
        configuraciones.map(config =>
            consultarAPI(config.ruta)
        )
    );

    const errores = [];

    resultados.forEach((resultado, indice) => {
        const config = configuraciones[indice];

        if (resultado.status === "fulfilled") {
            datosReportes[config.clave] = resultado.value;
            config.mostrar(resultado.value);
        } else {
            console.error(
                "Error en reporte " + config.clave,
                resultado.reason
            );

            errores.push(config.clave);

            datosReportes[config.clave] = [];

            mostrarErrorTabla(
                config.tabla,
                config.columnas,
                resultado.reason.message
            );

            if (config.clave === "materias" ||
                config.clave === "terminados") {
                $("totalMaterias").textContent =
                    config.clave === "materias"
                        ? "—"
                        : $("totalMaterias").textContent;

                $("totalTerminados").textContent =
                    config.clave === "terminados"
                        ? "—"
                        : $("totalTerminados").textContent;

                $("totalBajos").textContent = "—";
            }

            if (config.clave === "sucursales") {
                $("totalPedidos").textContent = "—";
                $("graficaSucursales").innerHTML = "";
            }

            if (config.clave === "solicitados") {
                $("graficaSolicitados").innerHTML = "";
            }

            if (config.clave === "producidos") {
                $("graficaProducidos").innerHTML = "";
            }
        }
    });

    if (!errores.length) {
        mostrarMensaje(
            "Reportes actualizados correctamente.",
            "exito"
        );
    } else {
        mostrarMensaje(
            "No se pudieron cargar " +
            errores.length +
            " reporte(s). Revisa la sesión, las rutas REST " +
            "y la consola del navegador.",
            "error"
        );
    }

    botones.forEach(boton => boton.disabled = false);
}

/* =========================================
   LIMPIAR FILTROS
========================================= */

function limpiarFiltros() {
    $("fechaInicio").value = "";
    $("fechaFin").value = "";
    $("filtroSucursal").value = "";

    cargarReportes();
}

/* =========================================
   IMPRIMIR REPORTES
========================================= */

function imprimirReporte(idReporte) {
    const elemento = $(idReporte);

    if (!elemento) {
        mostrarMensaje(
            "No se encontró el reporte para imprimir.",
            "error"
        );
        return;
    }

    const ventana = window.open(
        "",
        "_blank",
        "width=1000,height=750"
    );

    if (!ventana) {
        mostrarMensaje(
            "El navegador bloqueó la ventana de impresión.",
            "error"
        );
        return;
    }

    const seccion = elemento.closest(".seccion-reporte");
    const titulo = seccion?.querySelector("h3")?.textContent ||
        "Reporte";

    const estilos = `
        body {
            font-family: Arial, sans-serif;
            color: #573923;
            padding: 25px;
        }
        h1 { font-size: 23px; }
        h2 { font-size: 19px; margin-top: 20px; }
        p { color: #80634c; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 10px;
            border: 1px solid #d8c4ae;
            text-align: left;
            font-size: 12px;
        }
        th { background: #f0dfca; }
        .estado { font-weight: bold; }
    `;

    ventana.document.open();
    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${escapar(titulo)}</title>
            <style>${estilos}</style>
        </head>
        <body>
            <h1>Panadería San Carlos</h1>
            <h2>${escapar(titulo)}</h2>
            <p>Reporte generado desde el sistema de gestión.</p>
            ${elemento.outerHTML}
        </body>
        </html>
    `);
    ventana.document.close();

    ventana.focus();
    ventana.print();
}

/* =========================================
   EVENTOS
========================================= */

function configurarEventos() {
    $("btnActualizar").addEventListener(
        "click",
        cargarReportes
    );

    $("btnFiltrar").addEventListener(
        "click",
        cargarReportes
    );

    $("btnLimpiar").addEventListener(
        "click",
        limpiarFiltros
    );

    $("btnCerrarSesion").addEventListener(
        "click",
        cerrarSesion
    );

    document.querySelectorAll(".btn-imprimir")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                imprimirReporte(boton.dataset.reporte);
            });
        });
}

/* =========================================
   INICIALIZACIÓN
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!verificarSesion()) return;

    configurarEventos();

    await cargarReportes();
});
