

package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.IncidenciasManager;
import com.mycompany.proyectoweb.manager.RepartidoresManager;
import com.mycompany.proyectoweb.model.IncidenciaRequest;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Consumes;
import javax.ws.rs.Produces;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("incidencias")
@Produces(MediaType.APPLICATION_JSON)
public class IncidenciasController {

    @Context
    private HttpServletRequest request;

    private final IncidenciasManager manager =
            new IncidenciasManager();

    private final RepartidoresManager repartidoresManager =
            new RepartidoresManager();

    // Respuesta estandar para errores.
    private Response error(Response.Status estado, String mensaje) {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(estado)
                .entity(respuesta)
                .build();
    }

    // Obtiene la sesion del usuario autenticado.
    private HttpSession obtenerSesion() {
        return request == null ? null : request.getSession(false);
    }

    // =====================================================
    // GET: LISTAR TODAS LAS INCIDENCIAS
    // Acceso exclusivo para ADMIN
    // =====================================================

    @GET
    @Path("listar")
    public Response listarIncidencias() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion."
            );
        }

        String rol = String.valueOf(
                sesion.getAttribute("rol")
        );

        if (!"ADMIN".equalsIgnoreCase(rol.trim())) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo el administrador puede consultar todas las incidencias."
            );
        }

        try {

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");

            respuesta.put(
                    "incidencias",
                    manager.listarIncidencias()
            );

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudieron consultar las incidencias."
            );
        }
    }

    // =====================================================
    // GET: MIS INCIDENCIAS
    // Acceso exclusivo para REPARTIDOR
    // =====================================================

    @GET
    @Path("mis-incidencias")
    public Response misIncidencias() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion."
            );
        }

        String rol = String.valueOf(
                sesion.getAttribute("rol")
        );

        if (!"REPARTIDOR".equalsIgnoreCase(rol.trim())) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo los repartidores pueden consultar sus incidencias."
            );
        }

        try {

            Object idSesion =
                    sesion.getAttribute("idUsuario");

            Long idRepartidor =
                    Long.valueOf(idSesion.toString());

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");

            respuesta.put(
                    "incidencias",
                    manager.listarPorRepartidor(idRepartidor)
            );

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudieron consultar las incidencias del repartidor."
            );
        }
    }

    // =====================================================
    // POST: REGISTRAR INCIDENCIA
    // Acceso exclusivo para REPARTIDOR
    // Verifica asignacion y estado del pedido en Oracle.
    // Registra la incidencia en Firebase Firestore.
    // =====================================================

    @POST
    @Path("registrar")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registrarIncidencia(IncidenciaRequest datos) {

        HttpSession sesion = obtenerSesion();

        // Verificar autenticacion.
        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion."
            );
        }

        // Verificar rol del usuario.
        String rol = String.valueOf(
                sesion.getAttribute("rol")
        );

        if (!"REPARTIDOR".equalsIgnoreCase(rol.trim())) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo los repartidores pueden registrar incidencias."
            );
        }

        // Validar los datos recibidos.
        if (datos == null
                || datos.getIdPedido() == null
                || datos.getIdPedido() <= 0
                || datos.getTipoIncidencia() == null
                || datos.getTipoIncidencia().trim().isEmpty()
                || datos.getDescripcion() == null
                || datos.getDescripcion().trim().isEmpty()) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Debe indicar pedido, tipo de incidencia y descripcion."
            );
        }

        try {

            // Obtener el ID desde la sesion.
            // Nunca confiar en un ID enviado por el cliente.
            Long idRepartidor = Long.valueOf(
                    sesion.getAttribute("idUsuario").toString()
            );

            // Verificar en Oracle que el pedido pertenece
            // al repartidor y se encuentra DESPACHADO.
            boolean pedidoValido =
                    repartidoresManager.validarPedidoAsignado(
                            datos.getIdPedido(),
                            idRepartidor
                    );

            if (!pedidoValido) {

                return error(
                        Response.Status.FORBIDDEN,
                        "El pedido no esta asignado al repartidor "
                        + "o no se encuentra DESPACHADO."
                );
            }

            // Registrar la incidencia en Firestore.
            String idIncidencia = manager.registrarIncidencia(
                    datos.getIdPedido(),
                    idRepartidor,
                    datos.getTipoIncidencia().trim(),
                    datos.getDescripcion().trim()
            );

            // Preparar respuesta.
            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");

            respuesta.put(
                    "mensaje",
                    "Incidencia registrada correctamente."
            );

            respuesta.put(
                    "idIncidencia",
                    idIncidencia
            );

            respuesta.put(
                    "idPedido",
                    datos.getIdPedido()
            );

            respuesta.put(
                    "idRepartidor",
                    idRepartidor
            );

            return Response
                    .status(Response.Status.CREATED)
                    .entity(respuesta)
                    .build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudo registrar la incidencia."
            );
        }
    }
}

