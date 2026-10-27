
package com.mycompany.proyectoweb.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConexionOracle {

    private static final String URL =
            obtenerVariable("ORACLE_URL");

    private static final String USUARIO =
            obtenerVariable("ORACLE_USUARIO");

    private static final String CLAVE =
            obtenerVariable("ORACLE_CLAVE");

    private ConexionOracle() {
    }

    private static String obtenerVariable(String nombre) {

        String valor = System.getenv(nombre);

        if (valor == null || valor.trim().isEmpty()) {
            throw new IllegalStateException(
                "Falta configurar la variable de entorno: "
                + nombre
            );
        }

        return valor;
    }

    public static Connection getConnection() throws SQLException {

        try {
            Class.forName("oracle.jdbc.OracleDriver");
        } catch (ClassNotFoundException e) {
            throw new SQLException(
                "No se encontró el driver JDBC de Oracle.", e
            );
        }

        return DriverManager.getConnection(
                URL,
                USUARIO,
                CLAVE
        );
    }
}

