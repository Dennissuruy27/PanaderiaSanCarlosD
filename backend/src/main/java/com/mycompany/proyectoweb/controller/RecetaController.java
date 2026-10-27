package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.RecetaManager;
import com.mycompany.proyectoweb.model.Receta;
import com.mycompany.proyectoweb.model.RecetaDetalle;
import com.mycompany.proyectoweb.model.RecetaRequest;
import com.mycompany.proyectoweb.model.RecetaDetalleRequest;
import com.mycompany.proyectoweb.model.RecetaUpdateRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("recetas")
@Produces(MediaType.APPLICATION_JSON)
public class RecetaController {

    private final RecetaManager manager = new RecetaManager();

    @Context
    private HttpServletRequest request;

    // =====================================================
    // SESIÓN
    // =====================================================

    private HttpSession obtenerSesion() {
        return request.getSession(false);
    }

    private String obtenerRol() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return null;
        }

        Object rol = sesion.getAttribute("rol");

        return rol == null
                ? null
                : rol.toString().trim().toUpperCase();
    }

    private Integer obtenerIdUsuario() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return null;
        }

        Object valor = sesion.getAttribute("idUsuario");

        if (valor == null) {
            return null;
        }

        if (valor instanceof Number) {
            return ((Number) valor).intValue();
        }

        try {
            return Integer.parseInt(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean esAdmin() {
        return "ADMIN".equals(obtenerRol());
    }

    private boolean puedeGestionar() {
        String rol = obtenerRol();

        return "ADMIN".equals(rol)
                || "SUCURSAL".equals(rol);
    }

    // =====================================================
    // PERMISOS DE EDICIÓN
    // =====================================================

    private boolean puedeModificarReceta(Receta receta) {

        if (receta == null || receta.getActivo() != 1) {
            return false;
        }

        if (esAdmin()) {
            return true;
        }

        if ("SUCURSAL".equals(obtenerRol())) {

            Integer creador = receta.getIdUsuarioCreador();
            Integer usuario = obtenerIdUsuario();

            return receta.getAprobado() == 0
                    && creador != null
                    && usuario != null
                    && creador.equals(usuario);
        }

        return false;
    }

    // =====================================================
    // RESPUESTAS
    // =====================================================

    private Response error(
            Response.Status estado,
            String mensaje
    ) {
        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(estado)
                .entity(respuesta)
                .build();
    }

    private Response errorInterno(Exception e) {
        return error(
                Response.Status.INTERNAL_SERVER_ERROR,
                "Error al procesar la solicitud: " + e.getMessage()
        );
    }

    private Response validarSesion() {

        if (obtenerRol() == null || obtenerIdUsuario() == null) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
            );
        }

        return null;
    }

    private Response validarGestion() {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        if (!puedeGestionar()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "No tiene permisos para gestionar recetas."
            );
        }

        return null;
    }

    private Response validarAdmin() {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        if (!esAdmin()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "Esta operación es exclusiva del administrador."
            );
        }

        return null;
    }

    private Response procesarResultado(
            Map<String, Object> resultado,
            String campoId,
            Response.Status estadoExito
    ) {

        if (resultado == null) {
            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se recibió respuesta de Oracle."
            );
        }

        Object valor = resultado.get(campoId);

        int id = valor instanceof Number
                ? ((Number) valor).intValue()
                : -1;

        if (id <= 0) {

            Object mensaje = resultado.get("mensaje");

            return error(
                    Response.Status.BAD_REQUEST,
                    mensaje == null
                            ? "No se pudo completar la operación."
                            : mensaje.toString()
            );
        }

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "OK");
        respuesta.put(campoId, id);
        respuesta.put("mensaje", resultado.get("mensaje"));

        return Response.status(estadoExito)
                .entity(respuesta)
                .build();
    }

    private boolean recetaVisible(Receta receta) {

        if (receta == null) {
            return false;
        }

        if (puedeGestionar()) {
            return true;
        }

        return receta.getActivo() == 1
                && receta.getAprobado() == 1;
    }

    // =====================================================
    // 1. GET /recetas
    // =====================================================

    @GET
    public Response getRecetas() {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        try {
            List<Receta> recetas = manager.getRecetas();

            if (!puedeGestionar()) {

                List<Receta> aprobadas = new ArrayList<>();

                for (Receta receta : recetas) {
                    if (recetaVisible(receta)) {
                        aprobadas.add(receta);
                    }
                }

                return Response.ok(aprobadas).build();
            }

            return Response.ok(recetas).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 2. GET /recetas/todas
    // =====================================================

    @GET
    @Path("todas")
    public Response getTodasRecetas() {

        Response acceso = validarGestion();

        if (acceso != null) {
            return acceso;
        }

        try {
            return Response.ok(
                    manager.getTodasRecetas()
            ).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 3. GET /recetas/{id}
    // =====================================================

    @GET
    @Path("{id}")
    public Response getReceta(
            @PathParam("id") int id
    ) {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        try {
            Receta receta = manager.getReceta(id);

            if (!recetaVisible(receta)) {
                return error(
                        Response.Status.NOT_FOUND,
                        "Receta no encontrada."
                );
            }

            return Response.ok(receta).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 4. GET /recetas/{id}/detalle
    // =====================================================

    @GET
    @Path("{id}/detalle")
    public Response getDetalleReceta(
            @PathParam("id") int id
    ) {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        try {
            Receta receta = manager.getReceta(id);

            if (!recetaVisible(receta)) {
                return error(
                        Response.Status.NOT_FOUND,
                        "Receta no encontrada."
                );
            }

            List<RecetaDetalle> detalles =
                    manager.getDetalleReceta(id);

            return Response.ok(detalles).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 5. POST /recetas
    // =====================================================

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response insertarReceta(
            RecetaRequest receta
    ) {

        Response acceso = validarGestion();

        if (acceso != null) {
            return acceso;
        }

        if (receta == null
                || receta.getIdProducto() <= 0
                || receta.getNombreReceta() == null
                || receta.getNombreReceta().trim().isEmpty()
                || !Double.isFinite(receta.getRendimiento())
                || receta.getRendimiento() <= 0) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Debe ingresar producto, nombre y rendimiento válidos."
            );
        }

        try {
            Map<String, Object> resultado =
                    manager.insertarRecetaPropuesta(
                            receta,
                            obtenerIdUsuario()
                    );

            return procesarResultado(
                    resultado,
                    "idReceta",
                    Response.Status.CREATED
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 6. POST /recetas/propuesta
    // =====================================================

    @POST
    @Path("propuesta")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response insertarRecetaPropuesta(
            RecetaRequest receta
    ) {
        return insertarReceta(receta);
    }

    // =====================================================
    // 7. PUT /recetas/{id}
    // =====================================================

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response actualizarReceta(
            @PathParam("id") int id,
            RecetaUpdateRequest receta
    ) {

        Response acceso = validarGestion();

        if (acceso != null) {
            return acceso;
        }

        if (receta == null
                || receta.getNombreReceta() == null
                || receta.getNombreReceta().trim().isEmpty()
                || !Double.isFinite(receta.getRendimiento())
                || receta.getRendimiento() <= 0) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Nombre y rendimiento inválidos."
            );
        }

        try {
            Receta actual = manager.getReceta(id);

            if (actual == null) {
                return error(
                        Response.Status.NOT_FOUND,
                        "Receta no encontrada."
                );
            }

            if (!puedeModificarReceta(actual)) {
                return error(
                        Response.Status.FORBIDDEN,
                        "No tiene permisos para modificar esta receta."
                );
            }

            Map<String, Object> resultado =
                    manager.actualizarReceta(
                            id,
                            receta,
                            esAdmin()
                    );

            return procesarResultado(
                    resultado,
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 8. DELETE /recetas/{id}
    // =====================================================

    @DELETE
    @Path("{id}")
    public Response eliminarReceta(
            @PathParam("id") int id
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {
            return procesarResultado(
                    manager.eliminarReceta(id),
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 9. PUT /recetas/{id}/reactivar
    // =====================================================

    @PUT
    @Path("{id}/reactivar")
    public Response reactivarReceta(
            @PathParam("id") int id
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {
            return procesarResultado(
                    manager.reactivarReceta(id),
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 10. PUT /recetas/{id}/aprobar
    // =====================================================

    @PUT
    @Path("{id}/aprobar")
    public Response aprobarReceta(
            @PathParam("id") int id
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {
            return procesarResultado(
                    manager.aprobarReceta(id),
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 11. POST /recetas/{id}/detalle
    // =====================================================

    @POST
    @Path("{id}/detalle")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response insertarDetalleReceta(
            @PathParam("id") int id,
            RecetaDetalleRequest detalle
    ) {

        Response acceso = validarGestion();

        if (acceso != null) {
            return acceso;
        }

        if (detalle == null
                || detalle.getIdProducto() <= 0
                || !Double.isFinite(detalle.getCantidadD())
                || detalle.getCantidadD() <= 0) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Materia prima o cantidad inválida."
            );
        }

        try {
            Receta receta = manager.getReceta(id);

            if (receta == null) {
                return error(
                        Response.Status.NOT_FOUND,
                        "Receta no encontrada."
                );
            }

            if (!puedeModificarReceta(receta)) {
                return error(
                        Response.Status.FORBIDDEN,
                        "No puede agregar ingredientes a esta receta."
                );
            }

            Map<String, Object> resultado =
                    manager.insertarDetalleReceta(
                            id,
                            detalle,
                            esAdmin()
                    );

            return procesarResultado(
                    resultado,
                    "idDetalle",
                    Response.Status.CREATED
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 12. DELETE /recetas/detalle/{idDetalle}
    // =====================================================

    @DELETE
    @Path("detalle/{idDetalle}")
    public Response eliminarDetalleReceta(
            @PathParam("idDetalle") int idDetalle
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {
            return procesarResultado(
                    manager.eliminarDetalleReceta(
                            idDetalle,
                            esAdmin()
                    ),
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // =====================================================
    // 13. NUEVO: PUT /recetas/detalle/{idDetalle}
    //
    // MODIFICAR CANTIDAD DE INGREDIENTE
    // SOLO ADMIN
    // =====================================================

    @PUT
    @Path("detalle/{idDetalle}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response actualizarCantidadIngrediente(
            @PathParam("idDetalle") int idDetalle,
            Map<String, Object> datos
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        if (idDetalle <= 0 || datos == null) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "Datos inválidos."
            );
        }

        Object valor = datos.get("cantidadD");

        if (!(valor instanceof Number)) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "La cantidad debe ser numérica."
            );
        }

        double cantidad = ((Number) valor).doubleValue();

        if (!Double.isFinite(cantidad) || cantidad <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "La cantidad debe ser mayor que cero."
            );
        }

        try {
            Map<String, Object> resultado =
                    manager.actualizarCantidadIngrediente(
                            idDetalle,
                            cantidad,
                            esAdmin()
                    );

            return procesarResultado(
                    resultado,
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }
}


