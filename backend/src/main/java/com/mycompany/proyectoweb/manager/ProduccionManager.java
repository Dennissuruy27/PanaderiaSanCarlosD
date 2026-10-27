
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Produccion;
import com.mycompany.proyectoweb.model.ProduccionRequest;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ProduccionManager {

    // =========================================================
    // OBTENER TODAS LAS PRODUCCIONES
    // =========================================================

    public List<Produccion> getProducciones() throws Exception {

        List<Produccion> producciones = new ArrayList<>();

        String sql =
                "{call PKG_PRODUCCION.GET_PRODUCCIONES(?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.registerOutParameter(1, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {
                    producciones.add(mapearProduccion(rs));
                }
            }
        }

        return producciones;
    }

    // =========================================================
    // OBTENER PRODUCCION POR ID
    // =========================================================

    public Produccion getProduccion(
            int idProduccion) throws Exception {

        String sql =
                "{call PKG_PRODUCCION.GET_PRODUCCION(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idProduccion);

            stmt.registerOutParameter(2, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                if (rs.next()) {
                    return mapearProduccion(rs);
                }
            }
        }

        return null;
    }

    // =========================================================
    // CREAR ORDEN DE PRODUCCION
    // =========================================================

    public Map<String, Object> crearProduccion(
            ProduccionRequest produccion) throws Exception {

        String sql =
                "{call PKG_PRODUCCION.INS_PRODUCCION(?, ?, ?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, produccion.getIdProducto());
            stmt.setDouble(2, produccion.getCantidadP());
            stmt.setInt(3, produccion.getIdUsuario());

            stmt.registerOutParameter(4, Types.NUMERIC);
            stmt.registerOutParameter(5, Types.VARCHAR);

            stmt.execute();

            int idSalida = stmt.getInt(4);
            String mensaje = stmt.getString(5);

            return construirResultado(idSalida, mensaje);
        }
    }

    // =========================================================
    // INICIAR PRODUCCION
    // =========================================================

    public Map<String, Object> iniciarProduccion(
            int idProduccion) throws Exception {

        String sql =
                "{call PKG_PRODUCCION.INICIAR_PRODUCCION(?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idProduccion);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

            stmt.execute();

            int idSalida = stmt.getInt(2);
            String mensaje = stmt.getString(3);

            return construirResultado(idSalida, mensaje);
        }
    }

    // =========================================================
    // COMPLETAR PRODUCCION
    // =========================================================

    public Map<String, Object> completarProduccion(
            int idProduccion) throws Exception {

        String sql =
                "{call PKG_PRODUCCION.COMPLETAR_PRODUCCION(?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idProduccion);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

            stmt.execute();

            int idSalida = stmt.getInt(2);

            // Recuperar el mensaje exacto enviado por Oracle.
            String mensaje = stmt.getString(3);

            // Si falta materia prima, el mensaje incluirá:
            // - Nombre del ingrediente
            // - Cantidad necesaria
            // - Cantidad disponible
            // - Cantidad faltante

            return construirResultado(idSalida, mensaje);
        }
    }

    // =========================================================
    // CANCELAR PRODUCCION
    // =========================================================

    public Map<String, Object> cancelarProduccion(
            int idProduccion) throws Exception {

        String sql =
                "{call PKG_PRODUCCION.CANCELAR_PRODUCCION(?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idProduccion);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

            stmt.execute();

            int idSalida = stmt.getInt(2);
            String mensaje = stmt.getString(3);

            return construirResultado(idSalida, mensaje);
        }
    }

    // =========================================================
    // CONSTRUIR RESPUESTA UNIFORME
    // =========================================================

    private Map<String, Object> construirResultado(
            int idSalida,
            String mensaje) {

        Map<String, Object> resultado = new HashMap<>();

        resultado.put("idSalida", idSalida);

        if (mensaje == null || mensaje.trim().isEmpty()) {

            mensaje = idSalida > 0
                    ? "Operación realizada correctamente."
                    : "No se pudo realizar la operación.";
        }

        resultado.put("mensaje", mensaje);

        if (idSalida > 0) {
            resultado.put("estado", "OK");
        } else {
            resultado.put("estado", "ERROR");
        }

        return resultado;
    }

    // =========================================================
    // MAPEAR RESULTADOS DE ORACLE A OBJETO JAVA
    // =========================================================

    private Produccion mapearProduccion(
            ResultSet rs) throws Exception {

        Produccion produccion = new Produccion();

        produccion.setIdProduccion(
                rs.getInt("ID_PRODUCCION")
        );

        produccion.setIdProducto(
                rs.getInt("ID_PRODUCTO")
        );

        produccion.setNombreProducto(
                rs.getString("NOMBRE_PRODUCTO")
        );

        produccion.setCantidadP(
                rs.getDouble("CANTIDAD_P")
        );

        produccion.setUnidadMedida(
                rs.getString("UNIDAD_MEDIDA")
        );

        produccion.setFecha(
                rs.getString("FECHA")
        );

        produccion.setEstado(
                rs.getString("ESTADO")
        );

        produccion.setIdUsuario(
                rs.getInt("ID_USUARIO")
        );

        produccion.setNombreUsuario(
                rs.getString("NOMBRE_USUARIO")
        );

        return produccion;
    }
}
