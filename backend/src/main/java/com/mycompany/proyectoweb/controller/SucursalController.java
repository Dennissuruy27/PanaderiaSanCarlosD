
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.SucursalManager;
import com.mycompany.proyectoweb.model.Sucursal;
import com.mycompany.proyectoweb.model.SucursalRequest;

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

/**
 * Controlador REST de Sucursales.
 * Proyecto: Panadería San Carlos.
 */
@Path("sucursales")
@Produces(MediaType.APPLICATION_JSON)
public class SucursalController {

    private final SucursalManager manager =
            new SucursalManager();

    @Context
    private HttpServletRequest request;

    // =====================================================
    // RESPUESTAS AUXILIARES
    // =====================================================

    private Response respuestaError(
            Response.Status codigo,
            String mensaje
    ) {

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response
                .status(codigo)
                .entity(respuesta)
                .build();
    }

    private Response errorInterno(Exception e) {

        e.printStackTrace();

        return respuestaError(
                Response.Status.INTERNAL_SERVER_ERROR,
                "Ocurrió un error al procesar la solicitud."
        );
    }

    // =====================================================
    // SESIÓN Y PERMISOS
    // =====================================================

    private HttpSession obtenerSesion() {

        return request.getSession(false);
    }

    private boolean tieneSesion() {

        HttpSession sesion = obtenerSesion();

        return sesion != null
                && sesion.getAttribute("idUsuario") != null
                && sesion.getAttribute("rol") != null;
    }

    private String obtenerRol() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return "";
        }

        Object rol = sesion.getAttribute("rol");

        return rol == null
                ? ""
                : rol.toString().trim().toUpperCase();
    }

    private Integer obtenerIdSucursalSesion() {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return null;
        }

        Object valor = sesion.getAttribute("idSucursal");

        if (valor == null) {
            return null;
        }

        try {

            return Integer.valueOf(valor.toString());

        } catch (NumberFormatException e) {

            return null;
        }
    }

    private boolean esAdministrador() {

        return tieneSesion()
                && "ADMIN".equals(obtenerRol());
    }

    private boolean puedeConsultarSucursal(int idSucursal) {

        if (!tieneSesion()) {
            return false;
        }

        if (esAdministrador()) {
            return true;
        }

        Integer sucursalSesion =
                obtenerIdSucursalSesion();

        return sucursalSesion != null
                && sucursalSesion == idSucursal;
    }

    private Response validarAdministrador() {

        if (!tieneSesion()) {

            return respuestaError(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
            );
        }

        if (!esAdministrador()) {

            return respuestaError(
                    Response.Status.FORBIDDEN,
                    "No tiene permisos de administrador."
            );
        }

        return null;
    }

    private Response validarDatosSucursal(
            SucursalRequest sucursal
    ) {

        if (sucursal == null) {

            return respuestaError(
                    Response.Status.BAD_REQUEST,
                    "Debe proporcionar los datos de la sucursal."
            );
        }

        if (sucursal.getNombreSucursal() == null
                || sucursal.getNombreSucursal().trim().isEmpty()) {

            return respuestaError(
                    Response.Status.BAD_REQUEST,
                    "El nombre de la sucursal es obligatorio."
            );
        }

        return null;
    }

    private boolean operacionCorrecta(
            Map<String, Object> resultado,
            String campo
    ) {

        Object valor = resultado.get(campo);

        if (!(valor instanceof Number)) {
            return false;
        }

        return ((Number) valor).intValue() > 0;
    }

    private Response respuestaOperacion(
            Map<String, Object> resultado,
            String campo,
            Response.Status codigoExito
    ) {

        boolean correcto =
                operacionCorrecta(resultado, campo);

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put(
                "estado",
                correcto ? "OK" : "ERROR"
        );

        respuesta.put(
                campo,
                resultado.get(campo)
        );

        respuesta.put(
                "mensaje",
                resultado.get("mensaje")
        );

        return Response
                .status(
                        correcto
                        ? codigoExito.getStatusCode()
                        : Response.Status.BAD_REQUEST.getStatusCode()
                )
                .entity(respuesta)
                .build();
    }

    // =====================================================
    // 1. CONSULTAR SUCURSALES ACTIVAS
    // GET /api/sucursales
    // =====================================================

    @GET
    public Response getSucursales() {

        if (!tieneSesion()) {

            return respuestaError(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
            );
        }

        try {

            List<Sucursal> sucursales;

            if (esAdministrador()) {

                sucursales = manager.getSucursales();

            } else {

                sucursales = new java.util.ArrayList<>();

                Integer idSucursal =
                        obtenerIdSucursalSesion();

                if (idSucursal != null) {

                    Sucursal sucursal =
                            manager.getSucursal(idSucursal);

                    if (sucursal != null
                            && sucursal.getActivo() == 1) {

                        sucursales.add(sucursal);
                    }
                }
            }

            Map<String, Object> respuesta =
                    new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("cantidad", sucursales.size());
            respuesta.put("sucursales", sucursales);

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 2. CONSULTAR TODAS LAS SUCURSALES
    // GET /api/sucursales/todos
    // SOLO ADMINISTRADOR
    // =====================================================

    @GET
    @Path("todos")
    public Response getTodasSucursales() {

        Response permiso = validarAdministrador();

        if (permiso != null) {
            return permiso;
        }

        try {

            List<Sucursal> sucursales =
                    manager.getTodasSucursales();

            Map<String, Object> respuesta =
                    new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("cantidad", sucursales.size());
            respuesta.put("sucursales", sucursales);

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 3. CONSULTAR SUCURSAL POR ID
    // GET /api/sucursales/{id}
    // =====================================================

    @GET
    @Path("{id}")
    public Response getSucursal(
            @PathParam("id") int id
    ) {

        if (!tieneSesion()) {

            return respuestaError(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
            );
        }

        if (!puedeConsultarSucursal(id)) {

            return respuestaError(
                    Response.Status.FORBIDDEN,
                    "No tiene permisos para consultar esta sucursal."
            );
        }

        try {

            Sucursal sucursal =
                    manager.getSucursal(id);

            if (sucursal == null) {

                return respuestaError(
                        Response.Status.NOT_FOUND,
                        "Sucursal no encontrada."
                );
            }

            Map<String, Object> respuesta =
                    new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("sucursal", sucursal);

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 4. INSERTAR SUCURSAL
    // POST /api/sucursales
    // SOLO ADMINISTRADOR
    // =====================================================

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response insertarSucursal(
            SucursalRequest sucursal
    ) {

        Response permiso = validarAdministrador();

        if (permiso != null) {
            return permiso;
        }

        Response validacion =
                validarDatosSucursal(sucursal);

        if (validacion != null) {
            return validacion;
        }

        try {

            Map<String, Object> resultado =
                    manager.insertarSucursal(sucursal);

            return respuestaOperacion(
                    resultado,
                    "idSucursal",
                    Response.Status.CREATED
            );

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 5. ACTUALIZAR SUCURSAL
    // PUT /api/sucursales/{id}
    // SOLO ADMINISTRADOR
    // =====================================================

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response actualizarSucursal(
            @PathParam("id") int id,
            SucursalRequest sucursal
    ) {

        Response permiso = validarAdministrador();

        if (permiso != null) {
            return permiso;
        }

        Response validacion =
                validarDatosSucursal(sucursal);

        if (validacion != null) {
            return validacion;
        }

        try {

            Map<String, Object> resultado =
                    manager.actualizarSucursal(id, sucursal);

            return respuestaOperacion(
                    resultado,
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 6. DESACTIVAR SUCURSAL
    // DELETE /api/sucursales/{id}
    // SOLO ADMINISTRADOR
    // =====================================================

    @DELETE
    @Path("{id}")
    public Response eliminarSucursal(
            @PathParam("id") int id
    ) {

        Response permiso = validarAdministrador();

        if (permiso != null) {
            return permiso;
        }

        try {

            Map<String, Object> resultado =
                    manager.eliminarSucursal(id);

            return respuestaOperacion(
                    resultado,
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {

            return errorInterno(e);
        }
    }

    // =====================================================
    // 7. REACTIVAR SUCURSAL
    // PUT /api/sucursales/{id}/reactivar
    // SOLO ADMINISTRADOR
    // =====================================================

    @PUT
    @Path("{id}/reactivar")
    public Response reactivarSucursal(
            @PathParam("id") int id
    ) {

        Response permiso = validarAdministrador();

        if (permiso != null) {
            return permiso;
        }

        try {

            Map<String, Object> resultado =
                    manager.reactivarSucursal(id);

            return respuestaOperacion(
                    resultado,
                    "idSalida",
                    Response.Status.OK
            );

        } catch (Exception e) {

            return errorInterno(e);
        }
    }
}
