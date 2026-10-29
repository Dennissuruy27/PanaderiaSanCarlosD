
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.RepartidoresManager;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("repartidores")
@Produces(MediaType.APPLICATION_JSON)
public class RepartidoresController {

    @Context
    private HttpServletRequest request;

    private final RepartidoresManager manager =
            new RepartidoresManager();

    private Response error(Response.Status estado, String mensaje) {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(estado)
                .entity(respuesta)
                .build();
    }

    @GET
    @Path("mis-pedidos")
    public Response obtenerMisPedidos() {

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
                || !"REPARTIDOR".equalsIgnoreCase(
                        rol.toString().trim())) {

            return error(
                    Response.Status.FORBIDDEN,
                    "Solo los repartidores pueden consultar sus pedidos."
            );
        }

        try {
            Long idRepartidor = Long.valueOf(
                    sesion.getAttribute("idUsuario").toString()
            );

            List<Map<String, Object>> pedidos =
                    manager.obtenerPedidosRepartidor(idRepartidor);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("estado", "OK");
            respuesta.put("idRepartidor", idRepartidor);
            respuesta.put("totalPedidos", pedidos.size());
            respuesta.put("pedidos", pedidos);

            return Response.ok(respuesta).build();

        } catch (Exception e) {
            e.printStackTrace();

            return error(
                    Response.Status.INTERNAL_SERVER_ERROR,
                    "No se pudieron consultar los pedidos del repartidor."
            );
        }
    }
}
