
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.NotificacionesInventarioManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import com.mycompany.proyectoweb.config.FirebaseConfig;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.Timestamp;

import java.util.ArrayList;
import java.util.List;

import javax.ws.rs.GET;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Consumes;
import javax.ws.rs.Produces;
import javax.ws.rs.HeaderParam;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("notificaciones")
@Produces(MediaType.APPLICATION_JSON)
public class NotificacionesController {

    private final NotificacionesInventarioManager manager =
            new NotificacionesInventarioManager();

    @Context
    private HttpServletRequest request;

    private Response error(
            Response.Status codigo,
            String mensaje
    ) {

        Map<String, Object> datos = new HashMap<>();

        datos.put("estado", "ERROR");
        datos.put("mensaje", mensaje);

        return Response.status(codigo)
                .entity(datos)
                .build();
    }

    private Integer obtenerAdministrador() {

        if (request == null) {
            return null;
        }

        HttpSession sesion = request.getSession(false);

        if (sesion == null) {
            return null;
        }

        Object id = sesion.getAttribute("idUsuario");
        Object rol = sesion.getAttribute("rol");

        if (id == null || rol == null) {
            return null;
        }

        if (!"ADMIN".equalsIgnoreCase(
                rol.toString().trim())) {

            return null;
        }

        try {

            int idUsuario =
                    Integer.parseInt(id.toString());

            return idUsuario > 0 ? idUsuario : null;

        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ==========================================
    // REGISTRAR TELEFONO DE ADMINISTRADOR
    // POST /api/notificaciones/dispositivo
    // ==========================================

    @POST
    @Path("dispositivo")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registrar(
            Map<String, Object> datos
    ) {

        Integer administrador = obtenerAdministrador();

        if (administrador == null) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo el administrador puede registrar su dispositivo."
            );
        }

        if (datos == null
                || !(datos.get("token") instanceof String)) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "No se recibio el dispositivo."
            );
        }

        try {

            manager.registrarDispositivo(
                    administrador,
                    (String) datos.get("token")
            );

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put(
                    "mensaje",
                    "Dispositivo registrado correctamente."
            );

            return Response.ok(respuesta).build();

        } catch (IllegalArgumentException e) {

            return error(
                    Response.Status.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudo registrar el dispositivo."
            );
        }
    }

    // ==========================================
    // EJECUTAR REVISION AUTOMATICA
    // POST /api/notificaciones/ejecutar
    // ==========================================

    @POST
    @Path("ejecutar")
    public Response ejecutar(
            @HeaderParam("X-Cron-Secret")
            String claveRecibida
    ) {

        String claveEsperada =
                System.getenv("CRON_NOTIFICACIONES_CLAVE");

        if (claveEsperada == null
                || claveEsperada.trim().isEmpty()) {

            return error(
                    Response.Status.SERVICE_UNAVAILABLE,
                    "La revision automatica no esta configurada."
            );
        }

        if (claveRecibida == null
                || !MessageDigest.isEqual(
                        claveEsperada.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        claveRecibida.getBytes(
                                StandardCharsets.UTF_8
                        )
                )) {

            return error(
                    Response.Status.FORBIDDEN,
                    "No autorizado."
            );
        }

        try {

            Map<String, Object> resultado =
                    manager.procesarAlertas();

            return Response.ok(resultado).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudo completar la revision del inventario."
            );
        }
    }

    
@GET
@Path("alertas")
public Response consultarAlertas() {

    Integer administrador = obtenerAdministrador();

    if (administrador == null) {
        return error(
                Response.Status.FORBIDDEN,
                "Solo el administrador puede consultar las alertas."
        );
    }

    try {

        List<Map<String, Object>> alertas =
                new ArrayList<>();

        for (QueryDocumentSnapshot documento :
                FirebaseConfig.getFirestore()
                        .collection("estados_alertas_inventario")
                        .get()
                        .get()
                        .getDocuments()) {

            Map<String, Object> alerta =
                    new HashMap<>();

            alerta.put(
                    "id",
                    documento.getId()
            );

            alerta.put(
                    "nombreProducto",
                    documento.getString("nombreProducto")
            );

            alerta.put(
                    "ubicacion",
                    documento.getString("ubicacion")
            );

            Number existencia =
                    (Number) documento.get("existencia");

            Number minima =
                    (Number) documento.get("existenciaMinima");

            alerta.put(
                    "existencia",
                    existencia == null
                            ? 0
                            : existencia.doubleValue()
            );

            alerta.put(
                    "existenciaMinima",
                    minima == null
                            ? 0
                            : minima.doubleValue()
            );

            alerta.put(
                    "unidadMedida",
                    documento.getString("unidadMedida")
            );

            alerta.put(
                    "activa",
                    Boolean.TRUE.equals(
                            documento.getBoolean("activa")
                    )
            );

            Timestamp fecha =
                    documento.getTimestamp("ultimaRevision");

            alerta.put(
                    "ultimaRevision",
                    fecha == null
                            ? ""
                            : fecha.toDate()
                                    .toInstant()
                                    .toString()
            );

            alertas.add(alerta);
        }

        // Mostrar primero las alertas activas.
        alertas.sort((a, b) ->
                Boolean.compare(
                        Boolean.TRUE.equals(b.get("activa")),
                        Boolean.TRUE.equals(a.get("activa"))
                )
        );

        int activas = 0;

        for (Map<String, Object> alerta : alertas) {
            if (Boolean.TRUE.equals(alerta.get("activa"))) {
                activas++;
            }
        }

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put("estado", "OK");
        respuesta.put("alertas", alertas);
        respuesta.put("total", alertas.size());
        respuesta.put("activas", activas);
        respuesta.put(
                "recuperadas",
                alertas.size() - activas
        );

        return Response.ok(respuesta).build();

    } catch (Exception e) {

        e.printStackTrace();

        return error(
                Response.Status.INTERNAL_SERVER_ERROR,
                "No se pudieron consultar las alertas."
            );
        }
    }

}
