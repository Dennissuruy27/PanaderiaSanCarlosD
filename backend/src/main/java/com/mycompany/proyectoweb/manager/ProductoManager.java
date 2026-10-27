
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Producto;
import com.mycompany.proyectoweb.model.ProductoRequest;
import com.mycompany.proyectoweb.model.ProductoUpdateRequest;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import oracle.jdbc.OracleTypes;

public class ProductoManager {

    // ============================================
    // CONVERTIR RESULTSET A PRODUCTO
    // ============================================

    private Producto convertirProducto(ResultSet rs) throws Exception {

        Producto producto = new Producto();

        producto.setIdProducto(
            rs.getInt("ID_PRODUCTO")
        );

        producto.setNombreProducto(
            rs.getString("NOMBRE_PRODUCTO")
        );

        producto.setTipoProducto(
            rs.getString("TIPO_PRODUCTO")
        );

        producto.setUnidadMedida(
            rs.getString("UNIDAD_MEDIDA")
        );

        producto.setExistencia(
            rs.getDouble("EXISTENCIA")
        );

        producto.setExistenciaMinima(
            rs.getDouble("EXISTENCIA_MINIMA")
        );

        producto.setPrecioP(
            rs.getDouble("PRECIO_P")
        );

        producto.setActivo(
            rs.getInt("ACTIVO")
        );

        producto.setFechaCreacion(
            rs.getString("FECHA_CREACION")
        );

        producto.setAprobado(
            rs.getInt("APROBADO")
        );

        return producto;
    }

    // ============================================
    // OBTENER PRODUCTOS ACTIVOS
    // ============================================

    public List<Producto> getProductos() throws Exception {

        List<Producto> productos = new ArrayList<>();

        String sql = "{call PKG_PRODUCTOS.GET_PRODUCTOS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(1, OracleTypes.CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {

                    productos.add(convertirProducto(rs));

                }
            }
        }

        return productos;
    }

    // ============================================
    // NUEVO: OBTENER TODOS LOS PRODUCTOS
    // ACTIVOS Y DESACTIVADOS
    // ============================================

    public List<Producto> getTodosProductos() throws Exception {

        List<Producto> productos = new ArrayList<>();

        String sql =
            "{call PKG_PRODUCTOS.GET_TODOS_PRODUCTOS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(1, OracleTypes.CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {

                    productos.add(convertirProducto(rs));

                }
            }
        }

        return productos;
    }

    // ============================================
    // OBTENER PRODUCTO POR ID
    // ============================================

    public Producto getProducto(int idProducto) throws Exception {

        Producto producto = null;

        String sql = "{call PKG_PRODUCTOS.GET_PRODUCTO(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);

            stmt.registerOutParameter(2, OracleTypes.CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                if (rs.next()) {

                    producto = convertirProducto(rs);

                }
            }
        }

        return producto;
    }

    // ============================================
    // INSERTAR PRODUCTO
    // ============================================

    public Map<String, Object> insertarProducto(
        ProductoRequest producto
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        String sql =
            "{call PKG_PRODUCTOS.INS_PRODUCTO(?, ?, ?, ?, ?, ?, ?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setString(1, producto.getNombreProducto());
            stmt.setString(2, producto.getTipoProducto());
            stmt.setString(3, producto.getUnidadMedida());
            stmt.setDouble(4, producto.getExistencia());
            stmt.setDouble(5, producto.getExistenciaMinima());
            stmt.setDouble(6, producto.getPrecioP());

            stmt.registerOutParameter(7, Types.NUMERIC);
            stmt.registerOutParameter(8, Types.VARCHAR);

            stmt.execute();

            resultado.put(
                "idProducto",
                stmt.getInt(7)
            );

            resultado.put(
                "mensaje",
                stmt.getString(8)
            );
        }

        return resultado;
    }

    // ============================================
    // ACTUALIZAR PRODUCTO
    // ============================================

    public Map<String, Object> actualizarProducto(
        int idProducto,
        ProductoUpdateRequest producto
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        String sql =
            "{call PKG_PRODUCTOS.UPD_PRODUCTO(?, ?, ?, ?, ?, ?, ?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);
            stmt.setString(2, producto.getNombreProducto());
            stmt.setString(3, producto.getTipoProducto());
            stmt.setString(4, producto.getUnidadMedida());
            stmt.setDouble(5, producto.getExistenciaMinima());
            stmt.setDouble(6, producto.getPrecioP());

            stmt.registerOutParameter(7, Types.NUMERIC);
            stmt.registerOutParameter(8, Types.VARCHAR);

            stmt.execute();

            resultado.put(
                "idSalida",
                stmt.getInt(7)
            );

            resultado.put(
                "mensaje",
                stmt.getString(8)
            );
        }

        return resultado;
    }

    // ============================================
    // APROBAR PRODUCTO
    // ============================================

    public Map<String, Object> aprobarProducto(
        int idProducto
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        String sql =
            "{call PKG_PRODUCTOS.APROBAR_PRODUCTO(?, ?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

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

    // ============================================
    // DESACTIVAR PRODUCTO
    // ============================================

    public Map<String, Object> eliminarProducto(
        int idProducto
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        String sql =
            "{call PKG_PRODUCTOS.DEL_PRODUCTO(?, ?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

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

    // ============================================
    // NUEVO: REACTIVAR PRODUCTO
    // ============================================

    public Map<String, Object> reactivarProducto(
        int idProducto
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        String sql =
            "{call PKG_PRODUCTOS.REACTIVAR_PRODUCTO(?, ?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            // P_ID_PRODUCTO
            stmt.setInt(1, idProducto);

            // P_ID_SALIDA
            stmt.registerOutParameter(2, Types.NUMERIC);

            // P_MENSAJE
            stmt.registerOutParameter(3, Types.VARCHAR);

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


