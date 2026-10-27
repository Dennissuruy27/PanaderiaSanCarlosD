package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.config.ConexionOracle;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("prueba")
public class PruebaController {

    // =====================================================
    // PRUEBA DE LA API
    // =====================================================

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response prueba() {

        String json = """
                {
                    "estado": "OK",
                    "mensaje": "API funcionando correctamente"
                }
                """;

        return Response.ok(json).build();
    }


    // =====================================================
    // PRUEBA DE CONEXION A ORACLE
    // =====================================================

    @GET
    @Path("conexion")
    @Produces(MediaType.APPLICATION_JSON)
    public Response probarConexion() {

        try (
            Connection conexion = ConexionOracle.getConnection();
            Statement statement = conexion.createStatement();
            ResultSet resultado =
                    statement.executeQuery("SELECT USER FROM DUAL")
        ) {

            if (resultado.next()) {

                String usuario = resultado.getString(1);

                String json = """
                        {
                            "estado": "OK",
                            "mensaje": "Conexion a Oracle exitosa",
                            "usuario": "%s"
                        }
                        """.formatted(usuario);

                return Response.ok(json).build();
            }

            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("""
                            {
                                "estado": "ERROR",
                                "mensaje": "Oracle no devolvio resultados"
                            }
                            """)
                    .build();

        } catch (Exception e) {

            String mensaje = e.getMessage()
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", " ")
                    .replace("\r", " ");

            String json = """
                    {
                        "estado": "ERROR",
                        "mensaje": "%s"
                    }
                    """.formatted(mensaje);

            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(json)
                    .build();
        }
    }
}