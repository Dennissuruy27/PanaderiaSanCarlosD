
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.IncidenciasManager;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("incidencias")
@Produces(MediaType.APPLICATION_JSON)
public class IncidenciasController {

    @Context
    private HttpServletRequest request;

    private final IncidenciasManager manager = new IncidenciasManager();

    private Response error(Response.Status estado, String mensaje) {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);
        return Response.status(estado).entity(respuesta).build();
    }

    private HttpSession obtenerSesion() {
        return request == null ? null : request.getSession(false);
    }

    @GET
    @Path("listar")
    public Response listarIncidencias() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {
            return error(Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion.");
        }

        String rol = String.valueOf(sesion.getAttribute("rol"));

        if (!"ADMIN".equalsIgnoreCase(rol.trim())) {
            return error(Response.Status.FORBIDDEN,
                    "Solo el administrador puede consultar todas las incidencias.");
        }

        try {
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("estado", "OK");
            respuesta.put("incidencias", manager.listarIncidencias());

            return Response.ok(respuesta).build();

        } catch (Exception e) {
            e.printStackTrace();
            return error(Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudieron consultar las incidencias.");
        }
    }

    @GET
    @Path("mis-incidencias")
    public Response misIncidencias() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {
            return error(Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion.");
        }

        String rol = String.valueOf(sesion.getAttribute("rol"));

        if (!"REPARTIDOR".equalsIgnoreCase(rol.trim())) {
            return error(Response.Status.FORBIDDEN,
                    "Solo los repartidores pueden consultar sus incidencias.");
        }

        try {
            Object idSesion = sesion.getAttribute("idUsuario");

            Long idRepartidor = Long.valueOf(idSesion.toString());

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("estado", "OK");
            respuesta.put("incidencias",
                    manager.listarPorRepartidor(idRepartidor));

            return Response.ok(respuesta).build();

        } catch (Exception e) {
            e.printStackTrace();
            return error(Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudieron consultar las incidencias del repartidor.");
        }
    }
}
