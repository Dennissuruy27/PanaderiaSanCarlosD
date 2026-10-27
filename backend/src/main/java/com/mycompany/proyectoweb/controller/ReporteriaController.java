
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.ReporteriaManager;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.Produces;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("reporteria")
@Produces(MediaType.APPLICATION_JSON)
public class ReporteriaController {

    private final ReporteriaManager manager =
            new ReporteriaManager();

    @Context
    private HttpServletRequest request;

    // =========================================
    // VALIDACION DE SESION
    // =========================================

    private HttpSession obtenerSesion() {
        return request.getSession(false);
    }

    private boolean sesionValida() {

        HttpSession sesion = obtenerSesion();

        return sesion != null
                && sesion.getAttribute("idUsuario") != null;
    }

    private boolean esAdministrador() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return false;
        }

        Object rol = sesion.getAttribute("rol");

        return rol != null
                && "ADMIN".equalsIgnoreCase(
                        rol.toString()
                );
    }

    private Integer obtenerSucursalSesion() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return null;
        }

        Object valor = sesion.getAttribute("idSucursal");

        if (valor instanceof Number) {
            return ((Number) valor).intValue();
        }

        if (valor instanceof String) {

            try {
                return Integer.valueOf((String) valor);
            } catch (NumberFormatException e) {
                return null;
            }
        }

        return null;
    }

    // =========================================
    // RESPUESTAS DE ERROR
    // =========================================

    private Response error(
            Response.Status estado,
            String mensaje) {

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(estado)
                .entity(respuesta)
                .build();
    }

    private Response validarAdministrador() {

        if (!sesionValida()) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion."
            );
        }

        if (!esAdministrador()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "No tiene permisos para consultar este reporte."
            );
        }

        return null;
    }

    // =========================================
    // VALIDACION DE FILTROS
    // =========================================

    private LocalDate convertirFecha(String valor) {

        if (valor == null || valor.trim().isEmpty()) {
            return null;
        }

        return LocalDate.parse(valor.trim());
    }

    private String validarFechas(
            LocalDate inicio,
            LocalDate fin) {

        if (inicio != null &&
                fin != null &&
                inicio.isAfter(fin)) {

            return "La fecha inicial no puede ser mayor que la final.";
        }

        if (fin != null &&
                fin.equals(LocalDate.MAX)) {

            return "La fecha final esta fuera del rango permitido.";
        }

        return null;
    }

    private Integer resolverSucursal(
            Integer solicitada) {

        if (esAdministrador()) {
            return solicitada;
        }

        return obtenerSucursalSesion();
    }

    // =========================================
    // 1. MATERIAS PRIMAS
    // =========================================

    @GET
    @Path("materias-primas")
    public Response getMateriasPrimas() {

        Response acceso = validarAdministrador();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<Map<String, Object>> datos =
                    manager.getMateriasPrimas();

            return Response.ok(datos).build();

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar materias primas."
            );
        }
    }

    // =========================================
    // 2. PRODUCTOS TERMINADOS
    // =========================================

    @GET
    @Path("productos-terminados")
    public Response getProductosTerminados() {

        Response acceso = validarAdministrador();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<Map<String, Object>> datos =
                    manager.getProductosTerminados();

            return Response.ok(datos).build();

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar productos terminados."
            );
        }
    }

    // =========================================
    // 3. TOP 5 PRODUCTOS SOLICITADOS
    // =========================================

    @GET
    @Path("top-productos-solicitados")
    public Response getTopProductosSolicitados(
            @QueryParam("fechaInicio") String fechaInicio,
            @QueryParam("fechaFin") String fechaFin,
            @QueryParam("idSucursal") Integer idSucursal) {

        Response acceso = validarAdministrador();

        if (acceso != null) {
            return acceso;
        }

        try {

            LocalDate inicio = convertirFecha(fechaInicio);
            LocalDate fin = convertirFecha(fechaFin);

            String errorFechas = validarFechas(inicio, fin);

            if (errorFechas != null) {
                return error(
                        Response.Status.BAD_REQUEST,
                        errorFechas
                );
            }

            if (idSucursal != null && idSucursal <= 0) {
                return error(
                        Response.Status.BAD_REQUEST,
                        "La sucursal no es valida."
                );
            }

            List<Map<String, Object>> datos =
                    manager.getTopProductosSolicitados(
                            inicio,
                            fin,
                            resolverSucursal(idSucursal)
                    );

            return Response.ok(datos).build();

        } catch (DateTimeParseException e) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Formato de fecha invalido. Utilice AAAA-MM-DD."
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar productos solicitados."
            );
        }
    }

    // =========================================
    // 4. SUCURSALES CON MAS PEDIDOS
    // =========================================

    @GET
    @Path("top-sucursales")
    public Response getTopSucursales(
            @QueryParam("fechaInicio") String fechaInicio,
            @QueryParam("fechaFin") String fechaFin,
            @QueryParam("idSucursal") Integer idSucursal) {

        Response acceso = validarAdministrador();

        if (acceso != null) {
            return acceso;
        }

        try {

            LocalDate inicio = convertirFecha(fechaInicio);
            LocalDate fin = convertirFecha(fechaFin);

            String errorFechas = validarFechas(inicio, fin);

            if (errorFechas != null) {
                return error(
                        Response.Status.BAD_REQUEST,
                        errorFechas
                );
            }

            if (idSucursal != null && idSucursal <= 0) {
                return error(
                        Response.Status.BAD_REQUEST,
                        "La sucursal no es valida."
                );
            }

            List<Map<String, Object>> datos =
                    manager.getTopSucursales(
                            inicio,
                            fin,
                            resolverSucursal(idSucursal)
                    );

            return Response.ok(datos).build();

        } catch (DateTimeParseException e) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Formato de fecha invalido. Utilice AAAA-MM-DD."
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar sucursales."
            );
        }
    }

    // =========================================
    // 5. TOP 5 PRODUCTOS PRODUCIDOS
    // =========================================

    @GET
    @Path("top-productos-producidos")
    public Response getTopProductosProducidos(
            @QueryParam("fechaInicio") String fechaInicio,
            @QueryParam("fechaFin") String fechaFin) {

        Response acceso = validarAdministrador();

        if (acceso != null) {
            return acceso;
        }

        try {

            LocalDate inicio = convertirFecha(fechaInicio);
            LocalDate fin = convertirFecha(fechaFin);

            String errorFechas = validarFechas(inicio, fin);

            if (errorFechas != null) {
                return error(
                        Response.Status.BAD_REQUEST,
                        errorFechas
                );
            }

            List<Map<String, Object>> datos =
                    manager.getTopProductosProducidos(
                            inicio,
                            fin
                    );

            return Response.ok(datos).build();

        } catch (DateTimeParseException e) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Formato de fecha invalido. Utilice AAAA-MM-DD."
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar productos producidos."
            );
        }
    }
}

