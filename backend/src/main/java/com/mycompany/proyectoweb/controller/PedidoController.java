
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.PedidoManager;
import com.mycompany.proyectoweb.model.Pedido;
import com.mycompany.proyectoweb.model.PedidoRequest;
import com.mycompany.proyectoweb.model.PedidoDetalle;
import com.mycompany.proyectoweb.model.PedidoDetalleRequest;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.DELETE;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.Produces;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("pedidos")
@Produces(MediaType.APPLICATION_JSON)
public class PedidoController {

    private final PedidoManager manager = new PedidoManager();

    private static final Logger LOGGER =
            Logger.getLogger(PedidoController.class.getName());

    @Context
    private HttpServletRequest request;

    // ==============================================
    // CLASE INTERNA: USUARIO AUTENTICADO
    // ==============================================
    private static class UsuarioSesion {

        final int idUsuario;
        final int idSucursal;
        final String rol;

        UsuarioSesion(
                int idUsuario,
                int idSucursal,
                String rol) {

            this.idUsuario = idUsuario;
            this.idSucursal = idSucursal;

            this.rol = rol == null
                    ? ""
                    : rol.trim().toUpperCase();
        }

        boolean esAdmin() {
            return "ADMIN".equals(rol);
        }

        boolean esSucursal() {
            return "SUCURSAL".equals(rol);
        }

        boolean esRepartidor() {
            return "REPARTIDOR".equals(rol);
        }
    }

    // ==============================================
    // OBTENER USUARIO DESDE SESION HTTP
    // ==============================================
    private UsuarioSesion obtenerUsuarioSesion() {

        if (request == null) {
            return null;
        }

        HttpSession sesion = request.getSession(false);

        if (sesion == null) {
            return null;
        }

        Object idUsuarioObj =
                sesion.getAttribute("idUsuario");

        Object idSucursalObj =
                sesion.getAttribute("idSucursal");

        Object rolObj =
                sesion.getAttribute("rol");

        if (idUsuarioObj == null || rolObj == null) {
            return null;
        }

        try {

            int idUsuario = Integer.parseInt(
                    idUsuarioObj.toString()
            );

            int idSucursal = 0;

            if (idSucursalObj != null) {
                idSucursal = Integer.parseInt(
                        idSucursalObj.toString()
                );
            }

            String rol = rolObj.toString()
                    .trim()
                    .toUpperCase();

            if (idUsuario <= 0 || rol.isEmpty()) {
                return null;
            }

            return new UsuarioSesion(
                    idUsuario,
                    idSucursal,
                    rol
            );

        } catch (NumberFormatException e) {

            LOGGER.log(
                    Level.WARNING,
                    "Datos invalidos en la sesion HTTP",
                    e
            );

            return null;
        }
    }

    // ==============================================
    // VALIDAR SESION: ADMIN Y SUCURSAL
    // ==============================================
    private Response verificarSesion(
            UsuarioSesion usuario) {

        if (usuario == null) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debes iniciar sesion para acceder a pedidos."
            );
        }

        if (!usuario.esAdmin() && !usuario.esSucursal()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "Tu rol no tiene acceso al modulo de pedidos."
            );
        }

        if (usuario.esSucursal()
                && usuario.idSucursal <= 0) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Tu usuario no tiene una sucursal asignada."
            );
        }

        return null;
    }

    // ==============================================
    // VALIDAR ADMINISTRADOR
    // ==============================================
    private Response verificarAdministrador(
            UsuarioSesion usuario) {

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (!usuario.esAdmin()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "Esta operacion requiere permisos de administrador."
            );
        }

        return null;
    }

    // ==============================================
    // VALIDAR ACCESO A SUCURSAL
    // ==============================================
    private Response verificarAccesoSucursal(
            UsuarioSesion usuario,
            int idSucursal) {

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (idSucursal <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID de la sucursal no es valido."
            );
        }

        // ADMIN: acceso a todas las sucursales
        if (usuario.esAdmin()) {
            return null;
        }

        // SUCURSAL: acceso solo a su sucursal
        if (usuario.idSucursal != idSucursal) {
            return error(
                    Response.Status.FORBIDDEN,
                    "No tienes permisos para acceder a esta sucursal."
            );
        }

        return null;
    }

    // ==============================================
    // VALIDAR ACCESO A PEDIDO
    // ADMIN Y SUCURSAL
    // ==============================================
    private Response verificarAccesoPedido(
            UsuarioSesion usuario,
            int idPedido) throws Exception {

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (idPedido <= 0) {
            return idInvalido();
        }

        Pedido pedido = manager.getPedido(idPedido);

        if (pedido == null) {
            return error(
                    Response.Status.NOT_FOUND,
                    "El pedido no existe."
            );
        }

        return verificarAccesoSucursal(
                usuario,
                pedido.getIdSucursal()
        );
    }

    // ==============================================
    // 1. CONSULTAR PEDIDOS
    // GET /api/pedidos
    // ==============================================
    @GET
    public Response getPedidos() {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        try {

            if (usuario.esAdmin()) {
                List<Pedido> pedidos =
                        manager.getPedidos();

                return Response.ok(pedidos).build();
            }

            List<Pedido> pedidos =
                    manager.getPedidosSucursal(
                            usuario.idSucursal
                    );

            return Response.ok(pedidos).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 2. CONSULTAR PEDIDO POR ID
    // GET /api/pedidos/{id}
    // ==============================================
    @GET
    @Path("{id}")
    public Response getPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        try {

            Response validacion =
                    verificarAccesoPedido(usuario, id);

            if (validacion != null) {
                return validacion;
            }

            Pedido pedido = manager.getPedido(id);

            return Response.ok(pedido).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 3. CREAR PEDIDO
    // POST /api/pedidos
    // ==============================================
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crearPedido(
            PedidoRequest pedido) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (pedido == null
                || pedido.getIdSucursal() <= 0) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Los datos del pedido son invalidos."
            );
        }

        validacion = verificarAccesoSucursal(
                usuario,
                pedido.getIdSucursal()
        );

        if (validacion != null) {
            return validacion;
        }

        try {

            pedido.setIdUsuario(usuario.idUsuario);

            Map<String, Object> resultado =
                    manager.crearPedido(pedido);

            return respuestaOperacion(
                    resultado,
                    Response.Status.CREATED
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 4. AGREGAR PRODUCTO AL PEDIDO
    // POST /api/pedidos/{id}/detalle
    // ==============================================
    @POST
    @Path("{id}/detalle")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response agregarDetallePedido(
            @PathParam("id") int id,
            PedidoDetalleRequest detalle) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0
                || detalle == null
                || detalle.getIdProducto() <= 0
                || detalle.getCantidadDp() <= 0
                || Double.isNaN(detalle.getCantidadDp())
                || Double.isInfinite(detalle.getCantidadDp())) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Los datos del detalle son invalidos."
            );
        }

        try {

            validacion =
                    verificarAccesoPedido(usuario, id);

            if (validacion != null) {
                return validacion;
            }

            Map<String, Object> resultado =
                    manager.agregarDetallePedido(
                            id,
                            detalle
                    );

            return respuestaOperacion(
                    resultado,
                    Response.Status.CREATED
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 5. CONSULTAR DETALLE DEL PEDIDO
    // GET /api/pedidos/{id}/detalle
    //
    // ADMIN: pedidos autorizados
    // SUCURSAL: pedidos de su sucursal
    // REPARTIDOR: solo pedidos asignados
    // ==============================================
    @GET
    @Path("{id}/detalle")
    public Response getDetallePedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        if (usuario == null) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debes iniciar sesion."
            );
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            if (usuario.esRepartidor()) {

                List<Pedido> asignados =
                        manager.getPedidosRepartidor(
                                usuario.idUsuario
                        );

                boolean tieneAcceso = false;

                for (Pedido pedido : asignados) {

                    if (pedido.getIdPedido() == id) {
                        tieneAcceso = true;
                        break;
                    }
                }

                if (!tieneAcceso) {
                    return error(
                            Response.Status.FORBIDDEN,
                            "El pedido no esta asignado a este repartidor."
                    );
                }

            } else {

                Response validacion =
                        verificarAccesoPedido(usuario, id);

                if (validacion != null) {
                    return validacion;
                }
            }

            List<PedidoDetalle> detalles =
                    manager.getDetallePedido(id);

            return Response.ok(detalles).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 6. CONSULTAR PEDIDOS POR SUCURSAL
    // GET /api/pedidos/sucursal/{id}
    // ==============================================
    @GET
    @Path("sucursal/{id}")
    public Response getPedidosSucursal(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAccesoSucursal(usuario, id);

        if (validacion != null) {
            return validacion;
        }

        try {

            List<Pedido> pedidos =
                    manager.getPedidosSucursal(id);

            return Response.ok(pedidos).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 7. APROBAR PEDIDO
    // PUT /api/pedidos/{id}/aprobar
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/aprobar")
    public Response aprobarPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            Map<String, Object> resultado =
                    manager.aprobarPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 8. INICIAR PRODUCCION
    // PUT /api/pedidos/{id}/iniciar-produccion
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/iniciar-produccion")
    public Response iniciarProduccionPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            Map<String, Object> resultado =
                    manager.iniciarProduccionPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 9. PREPARAR PEDIDO
    // PUT /api/pedidos/{id}/preparar
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/preparar")
    public Response prepararPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            Map<String, Object> resultado =
                    manager.prepararPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 10. DESPACHAR PEDIDO
    // PUT /api/pedidos/{id}/despachar
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/despachar")
    public Response despacharPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            Map<String, Object> resultado =
                    manager.despacharPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 11. ENTREGAR PEDIDO
    // PUT /api/pedidos/{id}/entregar
    //
    // ADMIN O REPARTIDOR ASIGNADO
    // REPARTIDOR: SOLO DESPACHADO
    // ==============================================
    @PUT
    @Path("{id}/entregar")
    public Response entregarPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        if (usuario == null) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debes iniciar sesion."
            );
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            if (usuario.esRepartidor()) {

                // Obtener pedidos del repartidor
                // utilizando su ID de sesion.
                List<Pedido> asignados =
                        manager.getPedidosRepartidor(
                                usuario.idUsuario
                        );

                Pedido pedidoAsignado = null;

                for (Pedido pedido : asignados) {

                    if (pedido.getIdPedido() == id) {
                        pedidoAsignado = pedido;
                        break;
                    }
                }

                // Validar propiedad del pedido
                if (pedidoAsignado == null) {

                    return error(
                            Response.Status.FORBIDDEN,
                            "Este pedido no esta asignado a tu usuario."
                    );
                }

                // Validar estado permitido
                if (!"DESPACHADO".equalsIgnoreCase(
                        pedidoAsignado.getEstado())) {

                    return error(
                            Response.Status.CONFLICT,
                            "Solo puedes entregar pedidos DESPACHADOS."
                    );
                }

            } else {

                // Conservar acceso administrativo
                Response validacion =
                        verificarAdministrador(usuario);

                if (validacion != null) {
                    return validacion;
                }
            }

            // Ejecutar operacion de entrega
            // mediante el manager y Oracle
            Map<String, Object> resultado =
                    manager.entregarPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 12. CANCELAR PEDIDO
    // PUT /api/pedidos/{id}/cancelar
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/cancelar")
    public Response cancelarPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        try {

            Map<String, Object> resultado =
                    manager.cancelarPedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 13. ELIMINAR PRODUCTO DE UN PEDIDO
    // DELETE /api/pedidos/detalle/{id}
    // ==============================================
    @DELETE
    @Path("detalle/{id}")
    public Response eliminarDetallePedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion = verificarSesion(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID del detalle debe ser mayor que cero."
            );
        }

        try {

            List<Pedido> lista;

            if (usuario.esAdmin()) {
                lista = manager.getPedidos();
            } else {
                lista = manager.getPedidosSucursal(
                        usuario.idSucursal
                );
            }

            int idPedidoEncontrado = -1;

            for (Pedido pedido : lista) {

                List<PedidoDetalle> detalles =
                        manager.getDetallePedido(
                                pedido.getIdPedido()
                        );

                for (PedidoDetalle detalle : detalles) {

                    if (detalle.getIdDetalle() == id) {

                        idPedidoEncontrado =
                                pedido.getIdPedido();

                        break;
                    }
                }

                if (idPedidoEncontrado > 0) {
                    break;
                }
            }

            if (idPedidoEncontrado <= 0) {

                return error(
                        Response.Status.NOT_FOUND,
                        "El detalle no existe o no tienes permisos para eliminarlo."
                );
            }

            Map<String, Object> resultado =
                    manager.eliminarDetallePedido(id);

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 14. CONSULTAR DISPONIBILIDAD
    // GET /api/pedidos/{id}/disponibilidad
    // ==============================================
    @GET
    @Path("{id}/disponibilidad")
    public Response getDisponibilidadPedido(
            @PathParam("id") int id) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        try {

            Response validacion =
                    verificarAccesoPedido(usuario, id);

            if (validacion != null) {
                return validacion;
            }

            List<Map<String, Object>> productos =
                    manager.getDisponibilidadPedido(id);

            boolean disponible = !productos.isEmpty();
            double totalFaltante = 0;

            for (Map<String, Object> producto : productos) {

                String resultado = String.valueOf(
                        producto.get("resultado")
                );

                if (!"DISPONIBLE".equalsIgnoreCase(resultado)) {
                    disponible = false;
                }

                Object faltante =
                        producto.get("cantidadFaltante");

                if (faltante instanceof Number) {
                    totalFaltante +=
                            ((Number) faltante).doubleValue();
                }
            }

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("idPedido", id);
            respuesta.put("disponible", disponible);
            respuesta.put("requiereProduccion", !disponible);
            respuesta.put(
                    "cantidadTotalFaltante",
                    totalFaltante
            );
            respuesta.put("productos", productos);
            respuesta.put("estado", "OK");

            return Response.ok(respuesta).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 15. ASIGNAR REPARTIDOR
    // PUT /api/pedidos/{id}/asignar-repartidor
    // SOLO ADMIN
    // ==============================================
    @PUT
    @Path("{id}/asignar-repartidor")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response asignarRepartidor(
            @PathParam("id") int id,
            Map<String, Object> datos) {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        Response validacion =
                verificarAdministrador(usuario);

        if (validacion != null) {
            return validacion;
        }

        if (id <= 0) {
            return idInvalido();
        }

        if (datos == null
                || datos.get("idRepartidor") == null) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "Debe seleccionar un repartidor."
            );
        }

        int idRepartidor;

        try {

            idRepartidor = Integer.parseInt(
                    datos.get("idRepartidor").toString()
            );

        } catch (NumberFormatException e) {

            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID del repartidor no es valido."
            );
        }

        if (idRepartidor <= 0) {
            return error(
                    Response.Status.BAD_REQUEST,
                    "El ID del repartidor debe ser mayor que cero."
            );
        }

        try {

            Map<String, Object> resultado =
                    manager.asignarRepartidor(
                            id,
                            idRepartidor
                    );

            return respuestaOperacion(
                    resultado,
                    Response.Status.OK
            );

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // 16. PEDIDOS DEL REPARTIDOR
    // GET /api/pedidos/mis-pedidos
    // SOLO REPARTIDOR
    // ==============================================
    @GET
    @Path("mis-pedidos")
    public Response getMisPedidosRepartidor() {

        UsuarioSesion usuario = obtenerUsuarioSesion();

        if (usuario == null) {
            return error(
                    Response.Status.UNAUTHORIZED,
                    "Debes iniciar sesion."
            );
        }

        if (!usuario.esRepartidor()) {
            return error(
                    Response.Status.FORBIDDEN,
                    "Solo los repartidores pueden consultar esta ruta."
            );
        }

        try {

            List<Pedido> pedidos =
                    manager.getPedidosRepartidor(
                            usuario.idUsuario
                    );

            return Response.ok(pedidos).build();

        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    // ==============================================
    // RESPUESTA DE OPERACIONES ORACLE
    // ==============================================
    private Response respuestaOperacion(
            Map<String, Object> resultado,
            Response.Status estadoExito) {

        if (resultado == null
                || !(resultado.get("idSalida") instanceof Number)) {

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "La base de datos devolvio una respuesta invalida."
            );
        }

        int idSalida =
                ((Number) resultado.get("idSalida")).intValue();

        if (idSalida <= 0) {

            Map<String, Object> respuesta =
                    new HashMap<>(resultado);

            respuesta.put("estado", "ERROR");

            return Response.status(
                    Response.Status.BAD_REQUEST
            ).entity(respuesta).build();
        }

        Map<String, Object> respuesta =
                new HashMap<>(resultado);

        respuesta.put("estado", "OK");

        return Response.status(estadoExito)
                .entity(respuesta)
                .build();
    }

    // ==============================================
    // VALIDAR ID
    // ==============================================
    private Response idInvalido() {

        return error(
                Response.Status.BAD_REQUEST,
                "El ID del pedido debe ser mayor que cero."
        );
    }

    // ==============================================
    // RESPUESTA DE ERROR
    // ==============================================
    private Response error(
            Response.Status estado,
            String mensaje) {

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(estado)
                .entity(respuesta)
                .build();
    }

    // ==============================================
    // ERROR INTERNO
    // ==============================================
    private Response errorInterno(Exception e) {

        LOGGER.log(
                Level.SEVERE,
                "Error en PedidoController",
                e
        );

        return error(
                Response.Status.INTERNAL_SERVER_ERROR,
                "Ocurrio un error interno al procesar la solicitud."
        );
    }
}
