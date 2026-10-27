package com.mycompany.proyectoweb;

import com.mycompany.proyectoweb.config.CorsFilter;

import javax.ws.rs.ApplicationPath;
import org.glassfish.jersey.server.ResourceConfig;

@ApplicationPath("api")
public class JakartaRestConfiguration extends ResourceConfig {

    public JakartaRestConfiguration() {

        // REGISTRAR CONTROLADORES REST
        packages("com.mycompany.proyectoweb.controller");

        // REGISTRAR FILTRO CORS
        register(CorsFilter.class);
    }
}