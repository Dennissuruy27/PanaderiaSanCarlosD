package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.ProductoManager;
import com.mycompany.proyectoweb.model.Producto;
import com.mycompany.proyectoweb.model.ProductoUpdateRequest;
import javax.ws.rs.PUT;
import javax.ws.rs.DELETE;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.core.Context;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.mycompany.proyectoweb.model.ProductoRequest;
import javax.ws.rs.POST;
import javax.ws.rs.Consumes;
@Path("productos")
@Produces(MediaType.APPLICATION_JSON)
public class ProductoController {

    private final ProductoManager manager = new ProductoManager();
    @Context
    private HttpServletRequest httpRequest;


    // =====================================================
    // GET - OBTENER TODOS LOS PRODUCTOS
    // URL: /api/productos
    // =====================================================
    @GET
    public Response getProductos() {

        try {

            List<Producto> productos = manager.getProductos();

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("cantidad", productos.size());
            respuesta.put("productos", productos);

            return Response
                    .ok(respuesta)
                    .build();

        } catch (Exception e) {

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "ERROR");
            respuesta.put("mensaje", e.getMessage());

            return Response
                    .status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(respuesta)
                    .build();
        }
    }

    @GET
    @Path("{id}")
    public Response getProducto(@PathParam("id") int id) {

        try {

            Producto producto = manager.getProducto(id);

            Map<String, Object> respuesta = new HashMap<>();

            if (producto == null) {

                respuesta.put("estado", "ERROR");
                respuesta.put("mensaje", "Producto no encontrado");

                return Response
                        .status(Response.Status.NOT_FOUND)
                        .entity(respuesta)
                        .build();
            }

            respuesta.put("estado", "OK");
            respuesta.put("producto", producto);

            return Response
                    .ok(respuesta)
                    .build();

        } catch (Exception e) {

            Map<String, Object> respuesta = new HashMap<>();

            respuesta.put("estado", "ERROR");
            respuesta.put("mensaje", e.getMessage());

            return Response
                    .status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(respuesta)
                    .build();
        }
    }
    
 @POST
@Consumes(MediaType.APPLICATION_JSON)
public Response insertarProducto(ProductoRequest producto) {

    try {

        Map<String, Object> resultado =
                manager.insertarProducto(producto);

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "OK");
        respuesta.put("idProducto", resultado.get("idProducto"));
        respuesta.put("mensaje", resultado.get("mensaje"));

        return Response
                .status(Response.Status.CREATED)
                .entity(respuesta)
                .build();

    } catch (Exception e) {

        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", e.getMessage());

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
        }
    }


@PUT
@Path("{id}")
@Consumes(MediaType.APPLICATION_JSON)
public Response actualizarProducto(
        @PathParam("id") int id,
        ProductoUpdateRequest producto) {

    Map<String, Object> respuesta = new HashMap<>();

    try {

        // ==========================================
        // 1. VALIDAR SESIÓN
        // ==========================================

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "Debe iniciar sesión para editar productos."
            );

            return Response
                    .status(Response.Status.UNAUTHORIZED)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 2. VALIDAR ROL ADMIN
        // ==========================================

        Object rol = sesion.getAttribute("rol");

        if (rol == null
                || !"ADMIN".equalsIgnoreCase(rol.toString())) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "No tiene permisos para editar productos."
            );

            return Response
                    .status(Response.Status.FORBIDDEN)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 3. VALIDAR ID
        // ==========================================

        if (id <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "El ID del producto no es válido."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 4. VALIDAR DATOS RECIBIDOS
        // ==========================================

        if (producto == null
                || producto.getNombreProducto() == null
                || producto.getNombreProducto().trim().isEmpty()
                || producto.getTipoProducto() == null
                || producto.getTipoProducto().trim().isEmpty()
                || producto.getUnidadMedida() == null
                || producto.getUnidadMedida().trim().isEmpty()) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "Debe completar los datos obligatorios."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        if (!Double.isFinite(producto.getExistenciaMinima())
                || !Double.isFinite(producto.getPrecioP())
                || producto.getExistenciaMinima() < 0
                || producto.getPrecioP() < 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "La existencia mínima y el precio deben ser valores válidos."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 5. ACTUALIZAR PRODUCTO EN ORACLE
        // ==========================================

        Map<String, Object> resultado =
                manager.actualizarProducto(id, producto);

        int idSalida =
                ((Number) resultado.get("idSalida")).intValue();

        if (idSalida <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    resultado.get("mensaje")
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 6. RESPUESTA CORRECTA
        // ==========================================

        respuesta.put("estado", "OK");
        respuesta.put("idSalida", idSalida);
        respuesta.put(
                "mensaje",
                resultado.get("mensaje")
        );

        return Response
                .ok(respuesta)
                .build();

    } catch (Exception e) {

        e.printStackTrace();

        respuesta.put("estado", "ERROR");
        respuesta.put(
                "mensaje",
                "Error interno al actualizar el producto."
        );

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
    }
}



@PUT
@Path("{id}/aprobar")
public Response aprobarProducto(@PathParam("id") int id) {

    Map<String, Object> respuesta = new HashMap<>();

    try {

        // ==========================================
        // 1. COMPROBAR SESIÓN
        // ==========================================

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "Debe iniciar sesión para aprobar productos."
            );

            return Response
                    .status(Response.Status.UNAUTHORIZED)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 2. COMPROBAR ROL ADMIN
        // ==========================================

        Object rol = sesion.getAttribute("rol");

        if (rol == null
                || !"ADMIN".equalsIgnoreCase(rol.toString())) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "No tiene permisos para aprobar productos."
            );

            return Response
                    .status(Response.Status.FORBIDDEN)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 3. VALIDAR ID
        // ==========================================

        if (id <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "El ID del producto no es válido."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 4. APROBAR PRODUCTO
        // ==========================================

        Map<String, Object> resultado =
                manager.aprobarProducto(id);

        respuesta.put("estado", "OK");
        respuesta.put("idSalida", resultado.get("idSalida"));
        respuesta.put("mensaje", resultado.get("mensaje"));

        return Response
                .ok(respuesta)
                .build();

    } catch (Exception e) {

        e.printStackTrace();

        respuesta.put("estado", "ERROR");
        respuesta.put(
                "mensaje",
                "Error interno al aprobar el producto."
        );

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
    }
}



@DELETE
@Path("{id}")
public Response eliminarProducto(@PathParam("id") int id) {

    Map<String, Object> respuesta = new HashMap<>();

    try {

        // ==========================================
        // 1. VALIDAR SESIÓN
        // ==========================================

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "Debe iniciar sesión para desactivar productos."
            );

            return Response
                    .status(Response.Status.UNAUTHORIZED)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 2. VALIDAR ROL ADMIN
        // ==========================================

        Object rol = sesion.getAttribute("rol");

        if (rol == null
                || !"ADMIN".equalsIgnoreCase(rol.toString())) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "No tiene permisos para desactivar productos."
            );

            return Response
                    .status(Response.Status.FORBIDDEN)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 3. VALIDAR ID DEL PRODUCTO
        // ==========================================

        if (id <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    "El ID del producto no es válido."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 4. DESACTIVAR PRODUCTO EN ORACLE
        // ==========================================

        Map<String, Object> resultado =
                manager.eliminarProducto(id);

        int idSalida =
                ((Number) resultado.get("idSalida")).intValue();

        if (idSalida <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                    "mensaje",
                    resultado.get("mensaje")
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // ==========================================
        // 5. RESPUESTA CORRECTA
        // ==========================================

        respuesta.put("estado", "OK");
        respuesta.put("idSalida", idSalida);
        respuesta.put(
                "mensaje",
                resultado.get("mensaje")
        );

        return Response
                .ok(respuesta)
                .build();

    } catch (Exception e) {

        e.printStackTrace();

        respuesta.put("estado", "ERROR");
        respuesta.put(
                "mensaje",
                "Error interno al desactivar el producto."
        );

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
        }
    }


/* GET - CONSULTAR TODOS LOS PRODUCTOS
 ACTIVOS Y DESACTIVADOS*/

@GET
@Path("todos")
public Response getTodosProductos() {

    Map<String, Object> respuesta = new HashMap<>();

    try {

        List<Producto> productos = manager.getTodosProductos();

        respuesta.put("estado", "OK");
        respuesta.put("cantidad", productos.size());
        respuesta.put("productos", productos);

        return Response.ok(respuesta).build();

    } catch (Exception e) {

        e.printStackTrace();

        respuesta.put("estado", "ERROR");
        respuesta.put(
            "mensaje",
            "Error interno al consultar todos los productos."
        );

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
        }
    }

/* PUT - REACTIVAR PRODUCTO
 SOLO ADMIN*/

@PUT
@Path("{id}/reactivar")
public Response reactivarProducto(@PathParam("id") int id) {

    Map<String, Object> respuesta = new HashMap<>();

    try {

        // 1. VALIDAR SESION

        HttpSession sesion = httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                "mensaje",
                "Debe iniciar sesión para reactivar productos."
            );

            return Response
                    .status(Response.Status.UNAUTHORIZED)
                    .entity(respuesta)
                    .build();
        }

        // 2. VALIDAR ROL ADMIN

        Object rol = sesion.getAttribute("rol");

        if (rol == null
                || !"ADMIN".equalsIgnoreCase(rol.toString())) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                "mensaje",
                "No tiene permisos para reactivar productos."
            );

            return Response
                    .status(Response.Status.FORBIDDEN)
                    .entity(respuesta)
                    .build();
        }

        // 3. VALIDAR ID

        if (id <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                "mensaje",
                "El ID del producto no es válido."
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // 4. REACTIVAR PRODUCTO EN ORACLE

        Map<String, Object> resultado =
                manager.reactivarProducto(id);

        int idSalida =
                ((Number) resultado.get("idSalida")).intValue();

        if (idSalida <= 0) {

            respuesta.put("estado", "ERROR");
            respuesta.put(
                "mensaje",
                resultado.get("mensaje")
            );

            return Response
                    .status(Response.Status.BAD_REQUEST)
                    .entity(respuesta)
                    .build();
        }

        // 5. RESPUESTA CORRECTA

        respuesta.put("estado", "OK");
        respuesta.put("idSalida", idSalida);
        respuesta.put(
            "mensaje",
            resultado.get("mensaje")
        );

        return Response.ok(respuesta).build();

    } catch (Exception e) {

        e.printStackTrace();

        respuesta.put("estado", "ERROR");
        respuesta.put(
            "mensaje",
            "Error interno al reactivar el producto."
        );

        return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(respuesta)
                .build();
        }
    }

}