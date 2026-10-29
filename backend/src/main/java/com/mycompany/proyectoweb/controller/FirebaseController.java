
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.config.FirebaseConfig;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("firebase")
@Produces(MediaType.APPLICATION_JSON)
public class FirebaseController {

    @Context
    private HttpServletRequest request;

    // ==========================================
    // VALIDAR SESION DE ADMINISTRADOR
    // ==========================================

    private Response validarAdmin() {

        HttpSession sesion = request == null
                ? null
                : request.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesion."
            );
        }

        Object rol = sesion.getAttribute("rol");

        if (rol == null
                || !"ADMIN".equalsIgnoreCase(
                        rol.toString().trim())) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo el administrador puede realizar esta operacion."
            );
        }

        return null;
    }

    // ==========================================
    // RESPUESTA DE ERROR
    // ==========================================

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

    // ==========================================
    // 1. COMPROBAR CONEXION CON FIREBASE
    // GET /firebase/estado
    // ==========================================

    @GET
    @Path("estado")
    public Response verificarConexion() {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {

            Firestore db = FirebaseConfig.getFirestore();

            QuerySnapshot resultado = db
                    .collection("incidencias")
                    .limit(1)
                    .get()
                    .get(15, TimeUnit.SECONDS);

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put(
                    "mensaje",
                    "Conexion con Firebase exitosa"
            );
            respuesta.put(
                    "documentosConsultados",
                    resultado.size()
            );

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudo conectar con Firebase."
            );
        }
    }
}
