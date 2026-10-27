
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.ProduccionManager;
import com.mycompany.proyectoweb.model.Produccion;
import com.mycompany.proyectoweb.model.ProduccionRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("produccion")
@Produces(MediaType.APPLICATION_JSON)
public class ProduccionController {

    private final ProduccionManager manager =
            new ProduccionManager();

    @Context
    private HttpServletRequest request;

    /* =========================================
       VALIDACIÓN DE SESIÓN
    ========================================= */

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

    private int obtenerIdUsuario() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return 0;
        }

        Object id = sesion.getAttribute("idUsuario");

        if (id instanceof Number) {
            return ((Number) id).intValue();
        }

        return 0;
    }

    private Response validarAcceso() {

        if (!sesionValida()) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
            );
        }

        if (!esAdministrador()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "No tiene permisos para acceder a Producción."
            );
        }

        return null;
    }

    /* =========================================
       RESPUESTAS
    ========================================= */

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

    private Response procesarResultado(
            Map<String, Object> resultado,
            Response.Status estadoExito) {

        Object valor = resultado.get("idSalida");

        int idSalida = valor instanceof Number
                ? ((Number) valor).intValue()
                : -1;

        if (idSalida <= 0) {

            resultado.put("estado", "ERROR");

            return Response.status(
                    Response.Status.BAD_REQUEST
            ).entity(resultado).build();
        }

        resultado.put("estado", "OK");

        return Response.status(estadoExito)
                .entity(resultado)
                .build();
    }

    /* =========================================
       OBTENER TODAS LAS PRODUCCIONES
    ========================================= */

    @GET
    public Response getProducciones() {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<Produccion> producciones =
                    manager.getProducciones();

            return Response.ok(producciones).build();

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar las producciones."
            );
        }
    }

    /* =========================================
       OBTENER PRODUCCIÓN POR ID
    ========================================= */

    @GET
    @Path("{id}")
    public Response getProduccion(
            @PathParam("id") int id) {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID debe ser mayor que cero."
            );
        }

        try {

            Produccion produccion =
                    manager.getProduccion(id);

            if (produccion == null) {

                return error(
                        Response.Status.NOT_FOUND,
                        "La producción no existe."
                );
            }

            return Response.ok(produccion).build();

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al consultar la producción."
            );
        }
    }

    /* =========================================
       CREAR ORDEN DE PRODUCCIÓN
    ========================================= */

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crearProduccion(
            ProduccionRequest produccion) {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        if (produccion == null
                || produccion.getIdProducto() <= 0
                || !Double.isFinite(produccion.getCantidadP())
                || produccion.getCantidadP() <= 0) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Los datos de producción son inválidos."
            );
        }

        try {

            // El usuario se obtiene de la sesión,
            // no del JSON enviado por el navegador.

            produccion.setIdUsuario(
                    obtenerIdUsuario()
            );

            Map<String, Object> resultado =
                    manager.crearProduccion(produccion);

            return procesarResultado(
                    resultado,
                    Response.Status.CREATED
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al crear la producción."
            );
        }
    }

    /* =========================================
       INICIAR PRODUCCIÓN
    ========================================= */

    @PUT
    @Path("{id}/iniciar")
    public Response iniciarProduccion(
            @PathParam("id") int id) {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID debe ser mayor que cero."
            );
        }

        try {

            Map<String, Object> resultado =
                    manager.iniciarProduccion(id);

            return procesarResultado(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al iniciar la producción."
            );
        }
    }

    /* =========================================
       COMPLETAR PRODUCCIÓN
    ========================================= */

    @PUT
    @Path("{id}/completar")
    public Response completarProduccion(
            @PathParam("id") int id) {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID debe ser mayor que cero."
            );
        }

        try {

            Map<String, Object> resultado =
                    manager.completarProduccion(id);

            return procesarResultado(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al completar la producción."
            );
        }
    }

    /* =========================================
       CANCELAR PRODUCCIÓN
    ========================================= */

    @PUT
    @Path("{id}/cancelar")
    public Response cancelarProduccion(
            @PathParam("id") int id) {

        Response acceso = validarAcceso();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID debe ser mayor que cero."
            );
        }

        try {

            Map<String, Object> resultado =
                    manager.cancelarProduccion(id);

            return procesarResultado(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Error al cancelar la producción."
            );
        }
    }
}

