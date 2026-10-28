
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

    // ============================================
    // VALIDAR ORIGEN PERMITIDO
    // ============================================

    private boolean origenPermitido(String origen) {

        return "http://localhost:5501".equals(origen)
                || "http://127.0.0.1:5501".equals(origen)
                || "https://panaderiasancarlos-frontend.onrender.com".equals(origen);
    }

    @Override
    public void init(FilterConfig filterConfig)
            throws ServletException {
    }

    // ============================================
    // FILTRAR SOLICITUDES
    // ============================================

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

        boolean permitido = origenPermitido(origen);

        // ========================================
        // CONFIGURAR CABECERAS CORS
        // ========================================

        if (permitido) {

            res.setHeader(
                    "Access-Control-Allow-Origin",
                    origen
            );

            res.setHeader(
                    "Access-Control-Allow-Credentials",
                    "true"
            );

            res.setHeader(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, DELETE, OPTIONS"
            );

            res.setHeader(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization"
            );

            res.setHeader(
                    "Access-Control-Max-Age",
                    "600"
            );

            res.addHeader(
                    "Vary",
                    "Origin"
            );
        }

        // ========================================
        // RESPONDER SOLICITUD PREFLIGHT
        // ========================================

        if ("OPTIONS".equalsIgnoreCase(req.getMethod())
                && permitido) {

            res.setStatus(
                    HttpServletResponse.SC_NO_CONTENT
            );

            return;
        }

        // ========================================
        // CONTINUAR SOLICITUD NORMAL
        // ========================================

        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
    }
}
