package com.mycompany.proyectoweb.config;

import java.io.IOException;

import javax.annotation.Priority;
import javax.ws.rs.Priorities;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.container.ContainerResponseContext;
import javax.ws.rs.container.ContainerResponseFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class CorsFilter implements
        ContainerRequestFilter,
        ContainerResponseFilter {

    // VALIDAR ORIGEN PERMITIDO
    private boolean origenPermitido(String origen) {

        return "http://127.0.0.1:5501".equals(origen)
                || "http://localhost:5501".equals(origen);
    }

    // FILTRO DE PETICIONES
    @Override
    public void filter(ContainerRequestContext request)
            throws IOException {

        String origen = request.getHeaderString("Origin");
        
        System.out.println(
        "CORS FILTER EJECUTADO - Metodo: "
        + request.getMethod()
        + " - Origen: "
        + origen
    );

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())
        && origenPermitido(origen)) {

    request.abortWith(
            Response.noContent()
                    .header(
                            "Access-Control-Allow-Origin",
                            origen
                    )
                    .header(
                            "Access-Control-Allow-Credentials",
                            "true"
                    )
                    .header(
                            "Access-Control-Allow-Methods",
                            "GET, POST, PUT, DELETE, OPTIONS"
                    )
                    .header(
                            "Access-Control-Allow-Headers",
                            "Content-Type, Authorization"
                    )
                    .header(
                            "Access-Control-Max-Age",
                            "600"
                    )
                    .header(
                            "Vary",
                            "Origin"
                    )
                    .build()
            );
        }
    }

    // FILTRO DE RESPUESTAS
    @Override
    public void filter(
            ContainerRequestContext request,
            ContainerResponseContext response
    ) throws IOException {

        String origen = request.getHeaderString("Origin");

        if (origenPermitido(origen)) {

            response.getHeaders().putSingle(
                    "Access-Control-Allow-Origin",
                    origen
            );

            response.getHeaders().putSingle(
                    "Access-Control-Allow-Credentials",
                    "true"
            );

            response.getHeaders().putSingle(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, DELETE, OPTIONS"
            );

            response.getHeaders().putSingle(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization"
            );

            response.getHeaders().putSingle(
                    "Access-Control-Max-Age",
                    "600"
            );

            response.getHeaders().putSingle(
                    "Vary",
                    "Origin"
            );
        }
    }
}