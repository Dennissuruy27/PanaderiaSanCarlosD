
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;

import java.time.LocalDate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReporteriaManager {

    // =========================================
    // 1. INVENTARIO DE MATERIAS PRIMAS
    // =========================================

    public List<Map<String, Object>> getMateriasPrimas()
            throws Exception {

        String sql =
            "SELECT ID_PRODUCTO, NOMBRE_PRODUCTO, " +
            "TIPO_PRODUCTO, UNIDAD_MEDIDA, " +
            "EXISTENCIA, EXISTENCIA_MINIMA " +
            "FROM PRODUCTO " +
            "WHERE UPPER(TRIM(TIPO_PRODUCTO)) = 'MATERIA_PRIMA' " +
            "AND ACTIVO = 1 " +
            "ORDER BY NOMBRE_PRODUCTO";

        return consultarInventario(sql);
    }

    // =========================================
    // 2. INVENTARIO DE PRODUCTOS TERMINADOS
    // =========================================

    public List<Map<String, Object>> getProductosTerminados()
            throws Exception {

        String sql =
            "SELECT ID_PRODUCTO, NOMBRE_PRODUCTO, " +
            "TIPO_PRODUCTO, UNIDAD_MEDIDA, " +
            "EXISTENCIA, EXISTENCIA_MINIMA " +
            "FROM PRODUCTO " +
            "WHERE UPPER(TRIM(TIPO_PRODUCTO)) = 'PRODUCTO_TERMINADO' " +
            "AND ACTIVO = 1 " +
            "ORDER BY NOMBRE_PRODUCTO";

        return consultarInventario(sql);
    }

    private List<Map<String, Object>> consultarInventario(
            String sql) throws Exception {

        List<Map<String, Object>> resultados =
                new ArrayList<>();

        try (Connection conexion =
                    ConexionOracle.getConnection();
             PreparedStatement stmt =
                    conexion.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {

                Map<String, Object> producto =
                        new LinkedHashMap<>();

                double existencia =
                        rs.getDouble("EXISTENCIA");

                double minimo =
                        rs.getDouble("EXISTENCIA_MINIMA");

                producto.put(
                        "idProducto",
                        rs.getInt("ID_PRODUCTO")
                );

                producto.put(
                        "nombreProducto",
                        rs.getString("NOMBRE_PRODUCTO")
                );

                producto.put(
                        "tipoProducto",
                        rs.getString("TIPO_PRODUCTO")
                );

                producto.put(
                        "unidadMedida",
                        rs.getString("UNIDAD_MEDIDA")
                );

                producto.put(
                        "existencia",
                        existencia
                );

                producto.put(
                        "existenciaMinima",
                        minimo
                );

                producto.put(
                        "existenciaBaja",
                        existencia < minimo
                );

                resultados.add(producto);
            }
        }

        return resultados;
    }

    // =========================================
    // 3. TOP 5 PRODUCTOS MAS SOLICITADOS
    // =========================================

    public List<Map<String, Object>> getTopProductosSolicitados(
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal) throws Exception {

        List<Map<String, Object>> resultados =
                new ArrayList<>();

        String sql =
            "SELECT P.ID_PRODUCTO, P.NOMBRE_PRODUCTO, " +
            "P.UNIDAD_MEDIDA, " +
            "SUM(D.CANTIDAD_DP) AS TOTAL_SOLICITADO, " +
            "COUNT(DISTINCT PE.ID_PEDIDO) AS TOTAL_PEDIDOS " +
            "FROM PEDIDO_DETALLE D " +
            "INNER JOIN PEDIDO PE " +
            "ON PE.ID_PEDIDO = D.ID_PEDIDO " +
            "INNER JOIN PRODUCTO P " +
            "ON P.ID_PRODUCTO = D.ID_PRODUCTO " +
            "WHERE PE.ESTADO IN ('PENDIENTE', 'ENTREGADO') " +
            "AND (? IS NULL OR PE.FECHA >= ?) " +
            "AND (? IS NULL OR PE.FECHA < ?) " +
            "AND (? IS NULL OR PE.ID_SUCURSAL = ?) " +
            "GROUP BY P.ID_PRODUCTO, " +
            "P.NOMBRE_PRODUCTO, P.UNIDAD_MEDIDA " +
            "ORDER BY TOTAL_SOLICITADO DESC, " +
            "P.NOMBRE_PRODUCTO ASC " +
            "FETCH FIRST 5 ROWS ONLY";

        try (Connection conexion =
                    ConexionOracle.getConnection();
             PreparedStatement stmt =
                    conexion.prepareStatement(sql)) {

            establecerFiltros(
                    stmt,
                    fechaInicio,
                    fechaFin,
                    idSucursal
            );

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    Map<String, Object> fila =
                            new LinkedHashMap<>();

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

                    fila.put(
                            "totalSolicitado",
                            rs.getDouble("TOTAL_SOLICITADO")
                    );

                    fila.put(
                            "totalPedidos",
                            rs.getInt("TOTAL_PEDIDOS")
                    );

                    resultados.add(fila);
                }
            }
        }

        return resultados;
    }

    // =========================================
    // 4. SUCURSALES CON MAS PEDIDOS
    // =========================================

    public List<Map<String, Object>> getTopSucursales(
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal) throws Exception {

        List<Map<String, Object>> resultados =
                new ArrayList<>();

        String sql =
            "SELECT S.ID_SUCURSAL, S.NOMBRE_SUCURSAL, " +
            "COUNT(PE.ID_PEDIDO) AS TOTAL_PEDIDOS " +
            "FROM SUCURSAL S " +
            "LEFT JOIN PEDIDO PE " +
            "ON PE.ID_SUCURSAL = S.ID_SUCURSAL " +
            "AND PE.ESTADO IN ('PENDIENTE', 'ENTREGADO') " +
            "AND (? IS NULL OR PE.FECHA >= ?) " +
            "AND (? IS NULL OR PE.FECHA < ?) " +
            "WHERE (? IS NULL OR S.ID_SUCURSAL = ?) " +
            "GROUP BY S.ID_SUCURSAL, S.NOMBRE_SUCURSAL " +
            "ORDER BY TOTAL_PEDIDOS DESC, " +
            "S.NOMBRE_SUCURSAL ASC";

        try (Connection conexion =
                    ConexionOracle.getConnection();
             PreparedStatement stmt =
                    conexion.prepareStatement(sql)) {

            establecerFiltros(
                    stmt,
                    fechaInicio,
                    fechaFin,
                    idSucursal
            );

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    Map<String, Object> fila =
                            new LinkedHashMap<>();

                    fila.put(
                            "idSucursal",
                            rs.getInt("ID_SUCURSAL")
                    );

                    fila.put(
                            "nombreSucursal",
                            rs.getString("NOMBRE_SUCURSAL")
                    );

                    fila.put(
                            "totalPedidos",
                            rs.getInt("TOTAL_PEDIDOS")
                    );

                    resultados.add(fila);
                }
            }
        }

        return resultados;
    }

    // =========================================
    // 5. TOP 5 PRODUCTOS MAS PRODUCIDOS
    // =========================================

    public List<Map<String, Object>> getTopProductosProducidos(
            LocalDate fechaInicio,
            LocalDate fechaFin) throws Exception {

        List<Map<String, Object>> resultados =
                new ArrayList<>();

        String sql =
            "SELECT P.ID_PRODUCTO, P.NOMBRE_PRODUCTO, " +
            "P.UNIDAD_MEDIDA, " +
            "SUM(PR.CANTIDAD_P) AS TOTAL_PRODUCIDO, " +
            "COUNT(PR.ID_PRODUCCION) AS TOTAL_ORDENES " +
            "FROM PRODUCCION PR " +
            "INNER JOIN PRODUCTO P " +
            "ON P.ID_PRODUCTO = PR.ID_PRODUCTO " +
            "WHERE PR.ESTADO = 'COMPLETADA' " +
            "AND (? IS NULL OR PR.FECHA >= ?) " +
            "AND (? IS NULL OR PR.FECHA < ?) " +
            "GROUP BY P.ID_PRODUCTO, " +
            "P.NOMBRE_PRODUCTO, P.UNIDAD_MEDIDA " +
            "ORDER BY TOTAL_PRODUCIDO DESC, " +
            "P.NOMBRE_PRODUCTO ASC " +
            "FETCH FIRST 5 ROWS ONLY";

        try (Connection conexion =
                    ConexionOracle.getConnection();
             PreparedStatement stmt =
                    conexion.prepareStatement(sql)) {

            establecerFiltrosFechas(
                    stmt,
                    fechaInicio,
                    fechaFin
            );

            try (ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {

                    Map<String, Object> fila =
                            new LinkedHashMap<>();

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

                    fila.put(
                            "totalProducido",
                            rs.getDouble("TOTAL_PRODUCIDO")
                    );

                    fila.put(
                            "totalOrdenes",
                            rs.getInt("TOTAL_ORDENES")
                    );

                    resultados.add(fila);
                }
            }
        }

        return resultados;
    }

    // =========================================
    // FILTROS DE FECHA Y SUCURSAL
    // =========================================

    private void establecerFiltros(
            PreparedStatement stmt,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal) throws SQLException {

        establecerFiltrosFechas(
                stmt,
                fechaInicio,
                fechaFin
        );

        if (idSucursal == null) {
            stmt.setNull(5, java.sql.Types.NUMERIC);
            stmt.setNull(6, java.sql.Types.NUMERIC);
        } else {
            stmt.setInt(5, idSucursal);
            stmt.setInt(6, idSucursal);
        }
    }

    private void establecerFiltrosFechas(
            PreparedStatement stmt,
            LocalDate fechaInicio,
            LocalDate fechaFin) throws SQLException {

        if (fechaInicio == null) {
            stmt.setNull(1, java.sql.Types.DATE);
            stmt.setNull(2, java.sql.Types.DATE);
        } else {
            Date fecha = Date.valueOf(fechaInicio);
            stmt.setDate(1, fecha);
            stmt.setDate(2, fecha);
        }

        if (fechaFin == null) {
            stmt.setNull(3, java.sql.Types.DATE);
            stmt.setNull(4, java.sql.Types.DATE);
        } else {
            Date fechaExclusiva =
                    Date.valueOf(fechaFin.plusDays(1));

            stmt.setDate(3, fechaExclusiva);
            stmt.setDate(4, fechaExclusiva);
        }
    }
}
