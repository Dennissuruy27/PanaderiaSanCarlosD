
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.InventarioManager;
import com.mycompany.proyectoweb.model.EntradaInventarioRequest;
import com.mycompany.proyectoweb.model.SalidaInventarioRequest;
import com.mycompany.proyectoweb.model.ExistenciaInventario;
import com.mycompany.proyectoweb.model.ExistenciaBaja;
import com.mycompany.proyectoweb.model.MovimientoInventario;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("inventario")
@Produces(MediaType.APPLICATION_JSON)
public class InventarioController {

    private final InventarioManager manager =
            new InventarioManager();

    @Context
    private HttpServletRequest request;

    // ==========================================
    // VALIDACIONES DE SESIÓN
    // ==========================================

    private HttpSession obtenerSesion() {
        return request == null
                ? null
                : request.getSession(false);
    }

    private Integer obtenerEnteroSesion(String atributo) {

        HttpSession sesion = obtenerSesion();

        if (sesion == null) {
            return null;
        }

        Object valor = sesion.getAttribute(atributo);

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
        return obtenerEnteroSesion("idUsuario");
    }

    private Integer obtenerIdSucursal() {
        return obtenerEnteroSesion("idSucursal");
    }

    private boolean esAdmin() {
        return "ADMIN".equals(obtenerRol());
    }

    private boolean esSucursal() {
        return "SUCURSAL".equals(obtenerRol());
    }

    private Response validarSesion() {

        Integer idUsuario = obtenerIdUsuario();

        if (idUsuario == null || idUsuario <= 0) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debe iniciar sesión."
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
                    "Solo el administrador puede realizar esta operación."
            );
        }

        return null;
    }

    private Response validarAccesoSucursal(int idSucursal) {

        Response acceso = validarSesion();

        if (acceso != null) {
            return acceso;
        }

        if (idSucursal <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "La sucursal no es válida."
            );
        }

        if (esAdmin()) {
            return null;
        }

        if (esSucursal()) {

            Integer sucursalAsignada = obtenerIdSucursal();

            if (sucursalAsignada != null
                    && sucursalAsignada == idSucursal) {
                return null;
            }
        }

        return error(
                Response.Status.FORBIDDEN,
                "No tiene permisos para acceder a esta sucursal."
        );
    }

    // ==========================================
    // RESPUESTAS REUTILIZABLES
    // ==========================================

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

    private Response procesarResultado(
            Map<String, Object> resultado
    ) {

        if (resultado == null
                || !(resultado.get("idSalida") instanceof Number)) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "Oracle no devolvió un resultado válido."
            );
        }

        int idSalida =
                ((Number) resultado.get("idSalida")).intValue();

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("idSalida", idSalida);
        respuesta.put("mensaje", resultado.get("mensaje"));

        if (idSalida <= 0) {

            respuesta.put("estado", "ERROR");

            return Response.status(
                    Response.Status.BAD_REQUEST
            ).entity(respuesta).build();
        }

        respuesta.put("estado", "OK");

        return Response.status(
                Response.Status.CREATED
        ).entity(respuesta).build();
    }

    private Response errorInterno(Exception e) {

        e.printStackTrace();

        return error(
                Response.Status.INTERNAL_SERVER_ERROR,
                "Ocurrió un error al procesar la operación de inventario."
        );
    }

    private boolean cantidadValida(double cantidad) {
        return Double.isFinite(cantidad) && cantidad > 0;
    }

    private Integer leerEntero(
            Map<String, Object> datos,
            String clave
    ) {

        if (datos == null) {
            return null;
        }

        Object valor = datos.get(clave);

        if (!(valor instanceof Number)) {
            return null;
        }

        double numero = ((Number) valor).doubleValue();

        if (!Double.isFinite(numero)
                || numero <= 0
                || numero > Integer.MAX_VALUE
                || numero != Math.floor(numero)) {
            return null;
        }

        return (int) numero;
    }

    private Double leerCantidad(
            Map<String, Object> datos
    ) {

        if (datos == null) {
            return null;
        }

        Object valor = datos.get("cantidadM");

        if (!(valor instanceof Number)) {
            return null;
        }

        double cantidad = ((Number) valor).doubleValue();

        return cantidadValida(cantidad)
                ? cantidad
                : null;
    }

    private String leerMotivo(
            Map<String, Object> datos
    ) {

        if (datos == null
                || !(datos.get("motivo") instanceof String)) {
            return null;
        }

        String motivo =
                ((String) datos.get("motivo")).trim();

        return motivo.isEmpty() ? null : motivo;
    }

    // ==========================================
    // 1. REGISTRAR ENTRADA CENTRAL
    // POST /inventario/entrada
    // ==========================================

    @POST
    @Path("entrada")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registrarEntrada(
            EntradaInventarioRequest entrada
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        if (entrada == null
                || entrada.getIdProducto() <= 0
                || !cantidadValida(entrada.getCantidadM())
                || entrada.getMotivo() == null
                || entrada.getMotivo().trim().isEmpty()) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Producto, cantidad y motivo son obligatorios."
            );
        }

        try {

            // El usuario responsable proviene de la sesión.
            entrada.setIdUsuario(obtenerIdUsuario());

            return procesarResultado(
                    manager.registrarEntrada(entrada)
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 2. REGISTRAR SALIDA CENTRAL
    // POST /inventario/salida
    // ==========================================

    @POST
    @Path("salida")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registrarSalida(
            SalidaInventarioRequest salida
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        if (salida == null
                || salida.getIdProducto() <= 0
                || !cantidadValida(salida.getCantidadM())
                || salida.getMotivo() == null
                || salida.getMotivo().trim().isEmpty()) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Producto, cantidad y motivo son obligatorios."
            );
        }

        if (salida.getIdSucursal() != null) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Para enviar productos a sucursales utilice el endpoint despacho."
            );
        }

        try {

            salida.setIdUsuario(obtenerIdUsuario());

            return procesarResultado(
                    manager.registrarSalida(salida)
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 3. CONSULTAR TODOS LOS MOVIMIENTOS
    // GET /inventario/movimientos
    // ==========================================

    @GET
    @Path("movimientos")
    public Response getMovimientos() {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<MovimientoInventario> movimientos =
                    manager.getMovimientos();

            return Response.ok(movimientos).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 4. MOVIMIENTOS POR PRODUCTO
    // GET /inventario/movimientos/producto/{id}
    // ==========================================

    @GET
    @Path("movimientos/producto/{id}")
    public Response getMovimientosProducto(
            @PathParam("id") int id
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El producto no es válido."
            );
        }

        try {

            return Response.ok(
                    manager.getMovimientosProducto(id)
            ).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 5. MOVIMIENTOS POR SUCURSAL
    // GET /inventario/movimientos/sucursal/{id}
    // ==========================================

    @GET
    @Path("movimientos/sucursal/{id}")
    public Response getMovimientosSucursal(
            @PathParam("id") int id
    ) {

        Response acceso = validarAccesoSucursal(id);

        if (acceso != null) {
            return acceso;
        }

        try {

            return Response.ok(
                    manager.getMovimientosSucursal(id)
            ).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 6. CONSULTAR EXISTENCIAS CENTRALES
    // GET /inventario/existencias
    // ==========================================

    @GET
    @Path("existencias")
    public Response getExistencias() {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<ExistenciaInventario> existencias =
                    manager.getExistencias();

            return Response.ok(existencias).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 7. EXISTENCIAS CENTRALES BAJAS
    // GET /inventario/existencias/bajas
    // ==========================================

    @GET
    @Path("existencias/bajas")
    public Response getExistenciasBajas() {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<ExistenciaBaja> productos =
                    manager.getExistenciasBajas();

            return Response.ok(productos).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 8. EXISTENCIA CENTRAL DE UN PRODUCTO
    // GET /inventario/existencias/{id}
    // ==========================================

    @GET
    @Path("existencias/{id}")
    public Response getExistenciaProducto(
            @PathParam("id") int id
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El producto no es válido."
            );
        }

        try {

            ExistenciaInventario producto =
                    manager.getExistenciaProducto(id);

            if (producto == null) {

                return error(
                        Response.Status.NOT_FOUND,
                        "Producto no encontrado."
                );
            }

            return Response.ok(producto).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 9. INVENTARIO DE UNA SUCURSAL
    // GET /inventario/sucursal/{id}
    // ==========================================

    @GET
    @Path("sucursal/{id}")
    public Response getInventarioSucursal(
            @PathParam("id") int id
    ) {

        Response acceso = validarAccesoSucursal(id);

        if (acceso != null) {
            return acceso;
        }

        try {

            return Response.ok(
                    manager.getInventarioSucursal(id)
            ).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 10. EXISTENCIAS BAJAS DE SUCURSAL
    // GET /inventario/sucursal/{id}/bajas
    // ==========================================

    @GET
    @Path("sucursal/{id}/bajas")
    public Response getExistenciasBajasSucursal(
            @PathParam("id") int id
    ) {

        Response acceso = validarAccesoSucursal(id);

        if (acceso != null) {
            return acceso;
        }

        try {

            return Response.ok(
                    manager.getExistenciasBajasSucursal(id)
            ).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 11. DESPACHAR PRODUCTO A SUCURSAL
    // POST /inventario/despacho
    // ==========================================

    @POST
    @Path("despacho")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response despacharProducto(
            Map<String, Object> datos
    ) {

        Response acceso = validarAdmin();

        if (acceso != null) {
            return acceso;
        }

        Integer idProducto =
                leerEntero(datos, "idProducto");

        Integer idSucursal =
                leerEntero(datos, "idSucursal");

        Double cantidad =
                leerCantidad(datos);

        String motivo =
                leerMotivo(datos);

        if (idProducto == null
                || idSucursal == null
                || cantidad == null
                || motivo == null) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Producto, sucursal, cantidad y motivo son obligatorios."
            );
        }

        try {

            return procesarResultado(
                    manager.despacharProducto(
                            idProducto,
                            cantidad,
                            idSucursal,
                            obtenerIdUsuario(),
                            motivo
                    )
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==========================================
    // 12. REGISTRAR VENTA O MERMA EN SUCURSAL
    // POST /inventario/sucursal/salida
    // ==========================================

    @POST
    @Path("sucursal/salida")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registrarSalidaSucursal(
            Map<String, Object> datos
    ) {

        Integer idSucursal =
                leerEntero(datos, "idSucursal");

        Integer idProducto =
                leerEntero(datos, "idProducto");

        Double cantidad =
                leerCantidad(datos);

        String motivo =
                leerMotivo(datos);

        if (idSucursal == null
                || idProducto == null
                || cantidad == null
                || motivo == null) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Sucursal, producto, cantidad y motivo son obligatorios."
            );
        }

        Response acceso =
                validarAccesoSucursal(idSucursal);

        if (acceso != null) {
            return acceso;
        }

        try {

            return procesarResultado(
                    manager.registrarSalidaSucursal(
                            idProducto,
                            cantidad,
                            idSucursal,
                            obtenerIdUsuario(),
                            motivo
                    )
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }
}
