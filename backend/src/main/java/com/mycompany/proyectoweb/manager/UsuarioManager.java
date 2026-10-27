
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Usuario;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class UsuarioManager {

    // ============================================
    // 1. LOGIN EXISTENTE
    // ============================================

    public Usuario login(String usuario, String clave) throws Exception {

        String sql = "{call PKG_USUARIOS.GET_LOGIN(?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setString(1, usuario);
            cs.setString(2, clave);
            cs.registerOutParameter(3, Types.REF_CURSOR);

            cs.execute();

            try (ResultSet rs = (ResultSet) cs.getObject(3)) {

                if (rs.next()) {
                    return convertirUsuario(rs);
                }

                return null;
            }
        }
    }

    // ============================================
    // 2. CONSULTAR USUARIOS ACTIVOS
    // ============================================

    public List<Usuario> getUsuarios() throws Exception {

        List<Usuario> usuarios = new ArrayList<>();

        String sql = "{call PKG_USUARIOS.GET_USUARIOS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.registerOutParameter(1, Types.REF_CURSOR);
            cs.execute();

            try (ResultSet rs = (ResultSet) cs.getObject(1)) {

                while (rs.next()) {
                    usuarios.add(convertirUsuario(rs));
                }
            }
        }

        return usuarios;
    }

    // ============================================
    // 3. CONSULTAR TODOS LOS USUARIOS
    // ACTIVOS Y DESACTIVADOS
    // ============================================

    public List<Usuario> getTodosUsuarios() throws Exception {

        List<Usuario> usuarios = new ArrayList<>();

        String sql =
                "{call PKG_USUARIOS.GET_TODOS_USUARIOS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.registerOutParameter(1, Types.REF_CURSOR);
            cs.execute();

            try (ResultSet rs = (ResultSet) cs.getObject(1)) {

                while (rs.next()) {
                    usuarios.add(convertirUsuario(rs));
                }
            }
        }

        return usuarios;
    }

    // ============================================
    // 4. CONSULTAR USUARIO POR ID
    // ============================================

    public Usuario getUsuario(int idUsuario) throws Exception {

        String sql =
                "{call PKG_USUARIOS.GET_USUARIO(?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setInt(1, idUsuario);
            cs.registerOutParameter(2, Types.REF_CURSOR);

            cs.execute();

            try (ResultSet rs = (ResultSet) cs.getObject(2)) {

                if (rs.next()) {
                    return convertirUsuario(rs);
                }

                return null;
            }
        }
    }

    // ============================================
    // 5. REGISTRAR USUARIO
    // ============================================

    public Map<String, Object> insertarUsuario(
            String nombreUsuario,
            String usuario,
            String clave,
            String rol,
            Integer idSucursal
    ) throws Exception {

        String sql =
                "{call PKG_USUARIOS.INS_USUARIO(?,?,?,?,?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setString(1, nombreUsuario);
            cs.setString(2, usuario);
            cs.setString(3, clave);
            cs.setString(4, rol);

            if (idSucursal == null) {
                cs.setNull(5, Types.NUMERIC);
            } else {
                cs.setInt(5, idSucursal);
            }

            cs.registerOutParameter(6, Types.NUMERIC);
            cs.registerOutParameter(7, Types.VARCHAR);

            cs.execute();

            return obtenerResultado(cs, 6, 7);
        }
    }

    // ============================================
    // 6. ACTUALIZAR DATOS Y ROL
    // ============================================

    public Map<String, Object> actualizarUsuario(
            int idUsuario,
            String nombreUsuario,
            String usuario,
            String rol,
            Integer idSucursal
    ) throws Exception {

        String sql =
                "{call PKG_USUARIOS.UPD_USUARIO(?,?,?,?,?,?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setInt(1, idUsuario);
            cs.setString(2, nombreUsuario);
            cs.setString(3, usuario);

            // NULL significa conservar la contraseña.
            cs.setNull(4, Types.VARCHAR);

            cs.setString(5, rol);

            if (idSucursal == null) {
                cs.setNull(6, Types.NUMERIC);
            } else {
                cs.setInt(6, idSucursal);
            }

            cs.registerOutParameter(7, Types.NUMERIC);
            cs.registerOutParameter(8, Types.VARCHAR);

            cs.execute();

            return obtenerResultado(cs, 7, 8);
        }
    }

    // ============================================
    // 7. CAMBIAR CONTRASEÑA
    // ============================================

    public Map<String, Object> cambiarClaveUsuario(
            int idUsuario,
            String claveNueva
    ) throws Exception {

        String sql =
                "{call PKG_USUARIOS.CAMBIAR_CLAVE_USUARIO(?,?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setInt(1, idUsuario);
            cs.setString(2, claveNueva);

            cs.registerOutParameter(3, Types.NUMERIC);
            cs.registerOutParameter(4, Types.VARCHAR);

            cs.execute();

            return obtenerResultado(cs, 3, 4);
        }
    }

    // ============================================
    // 8. DESACTIVAR USUARIO
    // ============================================

    public Map<String, Object> desactivarUsuario(
            int idUsuario
    ) throws Exception {

        String sql =
                "{call PKG_USUARIOS.DEL_USUARIO(?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setInt(1, idUsuario);

            cs.registerOutParameter(2, Types.NUMERIC);
            cs.registerOutParameter(3, Types.VARCHAR);

            cs.execute();

            return obtenerResultado(cs, 2, 3);
        }
    }

    // ============================================
    // 9. REACTIVAR USUARIO
    // ============================================

    public Map<String, Object> reactivarUsuario(
            int idUsuario
    ) throws Exception {

        String sql =
                "{call PKG_USUARIOS.REACTIVAR_USUARIO(?,?,?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement cs = conexion.prepareCall(sql)
        ) {

            cs.setInt(1, idUsuario);

            cs.registerOutParameter(2, Types.NUMERIC);
            cs.registerOutParameter(3, Types.VARCHAR);

            cs.execute();

            return obtenerResultado(cs, 2, 3);
        }
    }

    // ============================================
    // 10. CONVERTIR RESULTSET A USUARIO
    // ============================================

 
    private Usuario convertirUsuario(ResultSet rs) throws Exception {

        Usuario u = new Usuario();

        u.setIdUsuario(
            rs.getInt("ID_USUARIO")
        );

        u.setNombreUsuario(
            rs.getString("NOMBRE_USUARIO")
        );

        u.setUsuario(
            rs.getString("USUARIO")
        );

        u.setRol(
            rs.getString("ROL")
        );

        int idSucursal = rs.getInt("ID_SUCURSAL");

        if (rs.wasNull()) {
        u.setIdSucursal(null);
        } else {
        u.setIdSucursal(idSucursal);
    }

        u.setNombreSucursal(
            rs.getString("NOMBRE_SUCURSAL")
    );

    // ALGUNOS CURSORES, COMO GET_LOGIN,
    // NO DEVUELVEN ACTIVO NI FECHA_CREACION.

    java.sql.ResultSetMetaData metadata = rs.getMetaData();

    boolean tieneActivo = false;
    boolean tieneFecha = false;

    for (int i = 1; i <= metadata.getColumnCount(); i++) {

        String columna = metadata.getColumnLabel(i);

        if ("ACTIVO".equalsIgnoreCase(columna)) {
            tieneActivo = true;
        }

        if ("FECHA_CREACION".equalsIgnoreCase(columna)) {
            tieneFecha = true;
        }
    }

    if (tieneActivo) {

        int activo = rs.getInt("ACTIVO");

        u.setActivo(
                rs.wasNull() ? null : activo
        );
    }

    if (tieneFecha) {
        u.setFechaCreacion(
                rs.getTimestamp("FECHA_CREACION")
        );
    }

    return u;
}


    // ============================================
    // 11. OBTENER RESULTADO DE PROCEDIMIENTO
    // ============================================

    private Map<String, Object> obtenerResultado(
            CallableStatement cs,
            int posicionId,
            int posicionMensaje
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        resultado.put(
                "idSalida",
                cs.getInt(posicionId)
        );

        resultado.put(
                "mensaje",
                cs.getString(posicionMensaje)
        );

        return resultado;
    }
}

