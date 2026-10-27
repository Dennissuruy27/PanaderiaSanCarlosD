
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Sucursal;
import com.mycompany.proyectoweb.model.SucursalRequest;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import oracle.jdbc.OracleTypes;

/**
 * Manager de Sucursales
 * Proyecto: Panadería San Carlos
 *
 * Conexión a Oracle mediante PKG_SUCURSALES.
 */
public class SucursalManager {

    // =====================================================
    // MÉTODO AUXILIAR: CONVERTIR RESULTSET A SUCURSAL
    // =====================================================

    private Sucursal convertirSucursal(ResultSet rs)
            throws Exception {

        Sucursal sucursal = new Sucursal();

        sucursal.setIdSucursal(
                rs.getInt("ID_SUCURSAL")
        );

        sucursal.setNombreSucursal(
                rs.getString("NOMBRE_SUCURSAL")
        );

        sucursal.setDireccion(
                rs.getString("DIRECCION")
        );

        sucursal.setTelefono(
                rs.getString("TELEFONO")
        );

        sucursal.setActivo(
                rs.getInt("ACTIVO")
        );

        sucursal.setFechaCreacion(
                rs.getString("FECHA_CREACION")
        );

        return sucursal;
    }

    // =====================================================
    // 1. OBTENER SUCURSALES ACTIVAS
    // =====================================================

    public List<Sucursal> getSucursales()
            throws Exception {

        List<Sucursal> sucursales = new ArrayList<>();

        String sql =
                "{call PKG_SUCURSALES.GET_SUCURSALES(?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(
                    1,
                    OracleTypes.CURSOR
            );

            stmt.execute();

            try (
                ResultSet rs =
                        (ResultSet) stmt.getObject(1)
            ) {

                while (rs.next()) {

                    sucursales.add(
                            convertirSucursal(rs)
                    );
                }
            }
        }

        return sucursales;
    }

    // =====================================================
    // 2. OBTENER TODAS LAS SUCURSALES
    // ACTIVAS E INACTIVAS
    // =====================================================

    public List<Sucursal> getTodasSucursales()
            throws Exception {

        List<Sucursal> sucursales = new ArrayList<>();

        String sql =
                "{call PKG_SUCURSALES.GET_TODAS_SUCURSALES(?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(
                    1,
                    OracleTypes.CURSOR
            );

            stmt.execute();

            try (
                ResultSet rs =
                        (ResultSet) stmt.getObject(1)
            ) {

                while (rs.next()) {

                    sucursales.add(
                            convertirSucursal(rs)
                    );
                }
            }
        }

        return sucursales;
    }

    // =====================================================
    // 3. OBTENER UNA SUCURSAL POR ID
    // =====================================================

    public Sucursal getSucursal(int idSucursal)
            throws Exception {

        Sucursal sucursal = null;

        String sql =
                "{call PKG_SUCURSALES.GET_SUCURSAL(?, ?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.setInt(
                    1,
                    idSucursal
            );

            stmt.registerOutParameter(
                    2,
                    OracleTypes.CURSOR
            );

            stmt.execute();

            try (
                ResultSet rs =
                        (ResultSet) stmt.getObject(2)
            ) {

                if (rs.next()) {

                    sucursal = convertirSucursal(rs);
                }
            }
        }

        return sucursal;
    }

    // =====================================================
    // 4. INSERTAR SUCURSAL
    // =====================================================

    public Map<String, Object> insertarSucursal(
            SucursalRequest sucursal
    ) throws Exception {

        Map<String, Object> resultado =
                new HashMap<>();

        String sql =
                "{call PKG_SUCURSALES.INS_SUCURSAL(?, ?, ?, ?, ?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.setString(
                    1,
                    sucursal.getNombreSucursal()
            );

            stmt.setString(
                    2,
                    sucursal.getDireccion()
            );

            stmt.setString(
                    3,
                    sucursal.getTelefono()
            );

            stmt.registerOutParameter(
                    4,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    5,
                    Types.VARCHAR
            );

            stmt.execute();

            resultado.put(
                    "idSucursal",
                    stmt.getInt(4)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(5)
            );
        }

        return resultado;
    }

    // =====================================================
    // 5. ACTUALIZAR SUCURSAL
    // =====================================================

    public Map<String, Object> actualizarSucursal(
            int idSucursal,
            SucursalRequest sucursal
    ) throws Exception {

        Map<String, Object> resultado =
                new HashMap<>();

        String sql =
                "{call PKG_SUCURSALES.UPD_SUCURSAL(?, ?, ?, ?, ?, ?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.setInt(
                    1,
                    idSucursal
            );

            stmt.setString(
                    2,
                    sucursal.getNombreSucursal()
            );

            stmt.setString(
                    3,
                    sucursal.getDireccion()
            );

            stmt.setString(
                    4,
                    sucursal.getTelefono()
            );

            stmt.registerOutParameter(
                    5,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    6,
                    Types.VARCHAR
            );

            stmt.execute();

            resultado.put(
                    "idSalida",
                    stmt.getInt(5)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(6)
            );
        }

        return resultado;
    }

    // =====================================================
    // 6. DESACTIVAR SUCURSAL
    // ELIMINACIÓN LÓGICA
    // =====================================================

    public Map<String, Object> eliminarSucursal(
            int idSucursal
    ) throws Exception {

        Map<String, Object> resultado =
                new HashMap<>();

        String sql =
                "{call PKG_SUCURSALES.DEL_SUCURSAL(?, ?, ?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.setInt(
                    1,
                    idSucursal
            );

            stmt.registerOutParameter(
                    2,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    3,
                    Types.VARCHAR
            );

            stmt.execute();

            resultado.put(
                    "idSalida",
                    stmt.getInt(2)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(3)
            );
        }

        return resultado;
    }

    // =====================================================
    // 7. REACTIVAR SUCURSAL
    // =====================================================

    public Map<String, Object> reactivarSucursal(
            int idSucursal
    ) throws Exception {

        Map<String, Object> resultado =
                new HashMap<>();

        String sql =
                "{call PKG_SUCURSALES.REACTIVAR_SUCURSAL(?, ?, ?)}";

        try (
            Connection conexion =
                    ConexionOracle.getConnection();

            CallableStatement stmt =
                    conexion.prepareCall(sql)
        ) {

            stmt.setInt(
                    1,
                    idSucursal
            );

            stmt.registerOutParameter(
                    2,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    3,
                    Types.VARCHAR
            );

            stmt.execute();

            resultado.put(
                    "idSalida",
                    stmt.getInt(2)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(3)
            );
        }

        return resultado;
    }

}

