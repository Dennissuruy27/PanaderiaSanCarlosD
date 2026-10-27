
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.EntradaInventarioRequest;
import com.mycompany.proyectoweb.model.SalidaInventarioRequest;
import com.mycompany.proyectoweb.model.MovimientoInventario;
import com.mycompany.proyectoweb.model.ExistenciaInventario;
import com.mycompany.proyectoweb.model.ExistenciaBaja;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InventarioManager {

    // ============================================
    // MÉTODOS AUXILIARES
    // ============================================

    private boolean tieneColumna(ResultSet rs, String columna)
            throws Exception {

        ResultSetMetaData meta = rs.getMetaData();

        for (int i = 1; i <= meta.getColumnCount(); i++) {
            if (meta.getColumnLabel(i).equalsIgnoreCase(columna)) {
                return true;
            }
        }

        return false;
    }

    private String textoOpcional(ResultSet rs, String columna)
            throws Exception {

        return tieneColumna(rs, columna)
                ? rs.getString(columna)
                : null;
    }

    private double numeroOpcional(ResultSet rs, String columna)
            throws Exception {

        return tieneColumna(rs, columna)
                ? rs.getDouble(columna)
                : 0;
    }

    private Map<String, Object> ejecutarOperacion(
            String procedimiento,
            Object... parametros
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        StringBuilder sql = new StringBuilder(
                "{call PKG_INVENTARIO." + procedimiento + "("
        );

        int total = parametros.length + 2;

        for (int i = 0; i < total; i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("?");
        }

        sql.append(")}");

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt =
                    conexion.prepareCall(sql.toString())
        ) {

            for (int i = 0; i < parametros.length; i++) {
                Object valor = parametros[i];
                int posicion = i + 1;

                if (valor == null) {
                    stmt.setNull(posicion, Types.NUMERIC);

                } else if (valor instanceof Integer) {
                    stmt.setInt(posicion, (Integer) valor);

                } else if (valor instanceof Number) {
                    stmt.setDouble(
                            posicion,
                            ((Number) valor).doubleValue()
                    );

                } else {
                    stmt.setString(posicion, valor.toString());
                }
            }

            stmt.registerOutParameter(
                    parametros.length + 1,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    parametros.length + 2,
                    Types.VARCHAR
            );

            stmt.execute();

            resultado.put(
                    "idSalida",
                    stmt.getInt(parametros.length + 1)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(parametros.length + 2)
            );
        }

        return resultado;
    }

    // ============================================
    // 1. REGISTRAR ENTRADA CENTRAL
    // ============================================

    public Map<String, Object> registrarEntrada(
            EntradaInventarioRequest entrada
    ) throws Exception {

        return ejecutarOperacion(
                "INS_ENTRADA",
                entrada.getIdProducto(),
                entrada.getCantidadM(),
                entrada.getMotivo(),
                entrada.getIdUsuario()
        );
    }

    // ============================================
    // 2. REGISTRAR SALIDA CENTRAL
    // ============================================

    public Map<String, Object> registrarSalida(
            SalidaInventarioRequest salida
    ) throws Exception {

        return ejecutarOperacion(
                "INS_SALIDA",
                salida.getIdProducto(),
                salida.getCantidadM(),
                salida.getMotivo(),
                salida.getIdUsuario(),
                salida.getIdSucursal()
        );
    }

    // ============================================
    // 3. CONSULTAR TODOS LOS MOVIMIENTOS
    // ============================================

    public List<MovimientoInventario> getMovimientos()
            throws Exception {

        List<MovimientoInventario> movimientos =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_MOVIMIENTOS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(1, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {
                    movimientos.add(mapearMovimiento(rs));
                }
            }
        }

        return movimientos;
    }

    // ============================================
    // MAPEAR MOVIMIENTO
    // ============================================

    private MovimientoInventario mapearMovimiento(
            ResultSet rs
    ) throws Exception {

        MovimientoInventario movimiento =
                new MovimientoInventario();

        movimiento.setIdMovimiento(
                rs.getInt("ID_MOVIMIENTO")
        );

        movimiento.setIdProducto(
                rs.getInt("ID_PRODUCTO")
        );

        movimiento.setNombreProducto(
                rs.getString("NOMBRE_PRODUCTO")
        );

        movimiento.setTipoProducto(
                textoOpcional(rs, "TIPO_PRODUCTO")
        );

        movimiento.setTipoMovimiento(
                rs.getString("TIPO_MOVIMIENTO")
        );

        movimiento.setCantidadM(
                rs.getDouble("CANTIDAD_M")
        );

        movimiento.setUnidadMedida(
                textoOpcional(rs, "UNIDAD_MEDIDA")
        );

        movimiento.setMotivo(
                rs.getString("MOTIVO")
        );

        movimiento.setIdUsuario(
                rs.getInt("ID_USUARIO")
        );

        movimiento.setNombreUsuario(
                rs.getString("NOMBRE_USUARIO")
        );

        int idSucursal = rs.getInt("ID_SUCURSAL");

        movimiento.setIdSucursal(
                rs.wasNull() ? null : idSucursal
        );

        movimiento.setNombreSucursal(
                rs.getString("NOMBRE_SUCURSAL")
        );

        movimiento.setFecha(
                rs.getString("FECHA")
        );

        return movimiento;
    }

    // ============================================
    // 4. MOVIMIENTOS POR PRODUCTO
    // ============================================

    public List<MovimientoInventario> getMovimientosProducto(
            int idProducto
    ) throws Exception {

        List<MovimientoInventario> movimientos =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_MOVIMIENTOS_PRODUCTO(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);
            stmt.registerOutParameter(2, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {
                    movimientos.add(mapearMovimiento(rs));
                }
            }
        }

        return movimientos;
    }

    // ============================================
    // 5. MOVIMIENTOS POR SUCURSAL
    // ============================================

    public List<MovimientoInventario> getMovimientosSucursal(
            int idSucursal
    ) throws Exception {

        List<MovimientoInventario> movimientos =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_MOVIMIENTOS_SUCURSAL(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idSucursal);
            stmt.registerOutParameter(2, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {
                    movimientos.add(mapearMovimiento(rs));
                }
            }
        }

        return movimientos;
    }

    // ============================================
    // MAPEAR EXISTENCIA CENTRAL
    // ============================================

    private ExistenciaInventario mapearExistencia(
            ResultSet rs
    ) throws Exception {

        ExistenciaInventario existencia =
                new ExistenciaInventario();

        existencia.setIdProducto(
                rs.getInt("ID_PRODUCTO")
        );

        existencia.setNombreProducto(
                rs.getString("NOMBRE_PRODUCTO")
        );

        existencia.setTipoProducto(
                rs.getString("TIPO_PRODUCTO")
        );

        existencia.setUnidadMedida(
                rs.getString("UNIDAD_MEDIDA")
        );

        existencia.setExistencia(
                rs.getDouble("EXISTENCIA")
        );

        existencia.setExistenciaMinima(
                rs.getDouble("EXISTENCIA_MINIMA")
        );

        existencia.setPrecioP(
                numeroOpcional(rs, "PRECIO_P")
        );

        return existencia;
    }

    // ============================================
    // 6. CONSULTAR EXISTENCIAS CENTRALES
    // ============================================

    public List<ExistenciaInventario> getExistencias()
            throws Exception {

        List<ExistenciaInventario> existencias =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_EXISTENCIAS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(1, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {
                    existencias.add(mapearExistencia(rs));
                }
            }
        }

        return existencias;
    }

    // ============================================
    // 7. CONSULTAR EXISTENCIAS BAJAS CENTRALES
    // ============================================

    public List<ExistenciaBaja> getExistenciasBajas()
            throws Exception {

        List<ExistenciaBaja> productos =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_EXISTENCIA_BAJA(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.registerOutParameter(1, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {

                    ExistenciaBaja producto =
                            new ExistenciaBaja();

                    double existencia =
                            rs.getDouble("EXISTENCIA");

                    double minima =
                            rs.getDouble("EXISTENCIA_MINIMA");

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

                    producto.setExistencia(existencia);
                    producto.setExistenciaMinima(minima);

                    producto.setFaltante(
                            Math.max(0, minima - existencia)
                    );

                    productos.add(producto);
                }
            }
        }

        return productos;
    }

    // ============================================
    // 8. EXISTENCIA CENTRAL DE UN PRODUCTO
    // ============================================

    public ExistenciaInventario getExistenciaProducto(
            int idProducto
    ) throws Exception {

        String sql =
                "{call PKG_INVENTARIO.GET_EXISTENCIA_PRODUCTO(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idProducto);
            stmt.registerOutParameter(2, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(2)) {

                if (rs.next()) {
                    return mapearExistencia(rs);
                }
            }
        }

        return null;
    }

    // ============================================
    // 9. CONSULTAR INVENTARIO DE UNA SUCURSAL
    // ============================================

    public List<Map<String, Object>> getInventarioSucursal(
            int idSucursal
    ) throws Exception {

        List<Map<String, Object>> inventario =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_INVENTARIO_SUCURSAL(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idSucursal);
            stmt.registerOutParameter(2, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {

                    Map<String, Object> fila = new HashMap<>();

                    fila.put(
                            "idInventario",
                            rs.getInt("ID_INVENTARIO")
                    );

                    fila.put(
                            "idSucursal",
                            rs.getInt("ID_SUCURSAL")
                    );

                    fila.put(
                            "nombreSucursal",
                            rs.getString("NOMBRE_SUCURSAL")
                    );

                    fila.put(
                            "idProducto",
                            rs.getInt("ID_PRODUCTO")
                    );

                    fila.put(
                            "nombreProducto",
                            rs.getString("NOMBRE_PRODUCTO")
                    );

                    fila.put(
                            "tipoProducto",
                            rs.getString("TIPO_PRODUCTO")
                    );

                    fila.put(
                            "unidadMedida",
                            rs.getString("UNIDAD_MEDIDA")
                    );

                    fila.put(
                            "existencia",
                            rs.getDouble("EXISTENCIA")
                    );

                    fila.put(
                            "existenciaMinima",
                            rs.getDouble("EXISTENCIA_MINIMA")
                    );

                    fila.put(
                            "fechaActualizacion",
                            rs.getString("FECHA_ACTUALIZACION")
                    );

                    inventario.add(fila);
                }
            }
        }

        return inventario;
    }

    // ============================================
    // 10. EXISTENCIAS BAJAS POR SUCURSAL
    // ============================================

    public List<Map<String, Object>> getExistenciasBajasSucursal(
            int idSucursal
    ) throws Exception {

        List<Map<String, Object>> productos =
                new ArrayList<>();

        String sql =
                "{call PKG_INVENTARIO.GET_EXISTENCIA_BAJA_SUCURSAL(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {

            stmt.setInt(1, idSucursal);
            stmt.registerOutParameter(2, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs =
                    (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {

                    Map<String, Object> fila = new HashMap<>();

                    double existencia =
                            rs.getDouble("EXISTENCIA");

                    double minima =
                            rs.getDouble("EXISTENCIA_MINIMA");

                    fila.put(
                            "idInventario",
                            rs.getInt("ID_INVENTARIO")
                    );

                    fila.put(
                            "idSucursal",
                            rs.getInt("ID_SUCURSAL")
                    );

                    fila.put(
                            "nombreSucursal",
                            rs.getString("NOMBRE_SUCURSAL")
                    );

                    fila.put(
                            "idProducto",
                            rs.getInt("ID_PRODUCTO")
                    );

                    fila.put(
                            "nombreProducto",
                            rs.getString("NOMBRE_PRODUCTO")
                    );

                    fila.put(
                            "unidadMedida",
                            rs.getString("UNIDAD_MEDIDA")
                    );

                    fila.put("existencia", existencia);
                    fila.put("existenciaMinima", minima);

                    fila.put(
                            "faltante",
                            Math.max(0, minima - existencia)
                    );

                    fila.put(
                            "fechaActualizacion",
                            rs.getString("FECHA_ACTUALIZACION")
                    );

                    productos.add(fila);
                }
            }
        }

        return productos;
    }

    // ============================================
    // 11. DESPACHAR PRODUCTO A UNA SUCURSAL
    // ============================================

    public Map<String, Object> despacharProducto(
            int idProducto,
            double cantidad,
            int idSucursal,
            int idUsuario,
            String motivo
    ) throws Exception {

        return ejecutarOperacion(
                "DESPACHAR_PRODUCTO",
                idProducto,
                cantidad,
                idSucursal,
                idUsuario,
                motivo
        );
    }

    // ============================================
    // 12. REGISTRAR SALIDA DE UNA SUCURSAL
    // ============================================

    public Map<String, Object> registrarSalidaSucursal(
            int idProducto,
            double cantidad,
            int idSucursal,
            int idUsuario,
            String motivo
    ) throws Exception {

        return ejecutarOperacion(
                "INS_SALIDA_SUCURSAL",
                idProducto,
                cantidad,
                idSucursal,
                idUsuario,
                motivo
        );
    }
}
