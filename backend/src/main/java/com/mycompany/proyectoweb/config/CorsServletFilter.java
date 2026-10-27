package com.mycompany.proyectoweb.config;

import java.io.IOException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebFilter(urlPatterns = "/api/*")
public class CorsServletFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig)
            throws ServletException {
    }

    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain
    ) throws IOException, ServletException {

        HttpServletRequest req =
                (HttpServletRequest) request;

        HttpServletResponse res =
                (HttpServletResponse) response;

        String origen = req.getHeader("Origin");

        // VALIDAR ORIGEN PERMITIDO
        boolean origenPermitido =
                "http://localhost:5501".equals(origen)
                || "http://127.0.0.1:5501".equals(origen);

        if (origenPermitido) {

            // PERMITIR ORIGEN DEL FRONTEND
            res.setHeader(
                    "Access-Control-Allow-Origin",
                    origen
            );

            // PERMITIR COOKIES DE SESIÓN
            res.setHeader(
                    "Access-Control-Allow-Credentials",
                    "true"
            );

            // MÉTODOS PERMITIDOS
            res.setHeader(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, DELETE, OPTIONS"
            );

            // ENCABEZADOS PERMITIDOS
            res.setHeader(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization"
            );

            // DURACIÓN DEL PREFLIGHT
            res.setHeader(
                    "Access-Control-Max-Age",
                    "600"
            );

            res.setHeader(
                    "Vary",
                    "Origin"
            );
        }

        // RESPONDER DIRECTAMENTE AL PREFLIGHT
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())
                && origenPermitido) {

            res.setStatus(
                    HttpServletResponse.SC_NO_CONTENT
            );

            return;
        }

        // CONTINUAR CON LA PETICIÓN NORMAL
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
    }
}